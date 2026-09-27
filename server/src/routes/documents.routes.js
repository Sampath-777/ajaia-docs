const express = require("express");
const multer = require("multer");
const mammoth = require("mammoth");

const db = require("../db/database");
const authenticate = require("../middleware/auth");
const { summarizeText, SummarizerError } = require("../services/summarizer");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const MAX_SUMMARY_CHARACTERS = 30000;

function tiptapToPlainText(node) {
  if (Array.isArray(node)) {
    return node.map(tiptapToPlainText).join("");
  }
  if (!node || typeof node !== "object") {
    return "";
  }
  if (node.type === "text") {
    return typeof node.text === "string" ? node.text : "";
  }
  if (node.type === "hardBreak") {
    return "\n";
  }

  const text = tiptapToPlainText(node.content);
  return ["paragraph", "heading", "listItem", "blockquote", "codeBlock"].includes(node.type)
    ? `${text}\n`
    : text;
}

router.use(authenticate);

// GET /api/documents
// Returns documents owned by the user and documents shared with the user.
router.get("/", (req, res) => {
  const documents = db
    .prepare(`
      SELECT
        d.id,
        d.title,
        d.owner_id,
        d.created_at,
        d.updated_at,
        CASE
          WHEN d.owner_id = ? THEN 'owner'
          ELSE 'shared'
        END AS access_type
      FROM documents d
      LEFT JOIN document_shares ds
        ON ds.document_id = d.id
        AND ds.user_id = ?
      WHERE d.owner_id = ?
         OR ds.user_id = ?
      ORDER BY d.updated_at DESC
    `)
    .all(req.user.id, req.user.id, req.user.id, req.user.id);

  res.json({
    success: true,
    documents,
  });
});

// POST /api/documents
// Creates a new document owned by the authenticated user.
router.post("/", (req, res) => {
  const { title } = req.body;

  const documentTitle =
    typeof title === "string" && title.trim()
      ? title.trim()
      : "Untitled document";

  const defaultContent = JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
      },
    ],
  });

  const result = db
    .prepare(`
      INSERT INTO documents (title, content, owner_id)
      VALUES (?, ?, ?)
    `)
    .run(documentTitle, defaultContent, req.user.id);

  const document = db
    .prepare(`
      SELECT
        id,
        title,
        content,
        owner_id,
        created_at,
        updated_at
      FROM documents
      WHERE id = ?
    `)
    .get(result.lastInsertRowid);

  res.status(201).json({
    success: true,
    document,
  });
});

// GET /api/documents/:id
// Owner or shared user can open the document.
router.get("/:id", (req, res) => {
  const documentId = Number(req.params.id);

  if (!Number.isInteger(documentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid document ID",
    });
  }

  const document = db
    .prepare(`
      SELECT
        d.id,
        d.title,
        d.content,
        d.owner_id,
        d.created_at,
        d.updated_at,
        CASE
          WHEN d.owner_id = ? THEN 'owner'
          ELSE 'shared'
        END AS access_type
      FROM documents d
      LEFT JOIN document_shares ds
        ON ds.document_id = d.id
        AND ds.user_id = ?
      WHERE d.id = ?
        AND (
          d.owner_id = ?
          OR ds.user_id = ?
        )
    `)
    .get(
      req.user.id,
      req.user.id,
      documentId,
      req.user.id,
      req.user.id
    );

  if (!document) {
    return res.status(404).json({
      success: false,
      message: "Document not found or access denied",
    });
  }

  const owner = db
    .prepare("SELECT id, name FROM users WHERE id = ?")
    .get(document.owner_id);

  if (document.owner_id === req.user.id) {
    document.access = {
      owner,
      sharedWith: db
        .prepare(`
          SELECT u.id, u.name, u.email, ds.permission
          FROM document_shares ds
          JOIN users u ON u.id = ds.user_id
          WHERE ds.document_id = ?
          ORDER BY u.name
        `)
        .all(documentId),
    };
  } else {
    const share = db
      .prepare(`
        SELECT permission
        FROM document_shares
        WHERE document_id = ? AND user_id = ?
      `)
      .get(documentId, req.user.id);

    document.access = {
      owner,
      permission: share?.permission || "edit",
    };
  }

  res.json({
    success: true,
    document,
  });
});

// DELETE /api/documents/:id
// Only the owner can permanently delete a document.
router.delete("/:id", (req, res) => {
  const documentId = Number(req.params.id);

  if (!Number.isInteger(documentId) || documentId < 1) {
    return res.status(400).json({
      success: false,
      message: "Invalid document ID",
    });
  }

  const document = db
    .prepare("SELECT id, owner_id FROM documents WHERE id = ?")
    .get(documentId);

  if (!document) {
    return res.status(404).json({
      success: false,
      message: "Document not found",
    });
  }

  if (document.owner_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Only the document owner can delete it",
    });
  }

  db.prepare("DELETE FROM documents WHERE id = ?").run(documentId);

  res.json({
    success: true,
    message: "Document deleted successfully",
  });
});

// POST /api/documents/:id/duplicate
// Copies an accessible document into the current user's ownership.
router.post("/:id/duplicate", (req, res) => {
  const documentId = Number(req.params.id);

  if (!Number.isInteger(documentId) || documentId < 1) {
    return res.status(400).json({
      success: false,
      message: "Invalid document ID",
    });
  }

  const document = db
    .prepare(`
      SELECT d.title, d.content
      FROM documents d
      LEFT JOIN document_shares ds
        ON ds.document_id = d.id AND ds.user_id = ?
      WHERE d.id = ? AND (d.owner_id = ? OR ds.user_id = ?)
    `)
    .get(req.user.id, documentId, req.user.id, req.user.id);

  if (!document) {
    return res.status(404).json({
      success: false,
      message: "Document not found or access denied",
    });
  }

  const result = db
    .prepare(`
      INSERT INTO documents (title, content, owner_id)
      VALUES (?, ?, ?)
    `)
    .run(`${document.title} (Copy)`, document.content, req.user.id);

  const duplicate = db
    .prepare(`
      SELECT id, title, content, owner_id, created_at, updated_at
      FROM documents
      WHERE id = ?
    `)
    .get(result.lastInsertRowid);

  res.status(201).json({
    success: true,
    document: duplicate,
  });
});

// POST /api/documents/:id/summarize
// Summarizes authorized document content without modifying it.
router.post("/:id/summarize", async (req, res) => {
  const documentId = Number(req.params.id);

  if (!Number.isInteger(documentId) || documentId < 1) {
    return res.status(400).json({
      success: false,
      message: "Invalid document ID",
    });
  }

  const document = db
    .prepare(`
      SELECT d.content
      FROM documents d
      LEFT JOIN document_shares ds
        ON ds.document_id = d.id AND ds.user_id = ?
      WHERE d.id = ? AND (d.owner_id = ? OR ds.user_id = ?)
    `)
    .get(req.user.id, documentId, req.user.id, req.user.id);

  if (!document) {
    return res.status(404).json({
      success: false,
      message: "Document not found or access denied",
    });
  }

  let content;
  try {
    content = JSON.parse(document.content);
  } catch {
    return res.status(400).json({
      success: false,
      message: "Document content is not valid TipTap JSON",
    });
  }

  const text = tiptapToPlainText(content).replace(/[\t\r ]+/g, " ").trim();
  if (!text) {
    return res.status(400).json({
      success: false,
      message: "This document has no text to summarize",
    });
  }

  if (text.length > MAX_SUMMARY_CHARACTERS) {
    return res.status(413).json({
      success: false,
      message: `This document is too long to summarize. The limit is ${MAX_SUMMARY_CHARACTERS.toLocaleString()} characters.`,
    });
  }

  try {
    const summary = await summarizeText(text);
    return res.json({ success: true, summary });
  } catch (error) {
    const status = error instanceof SummarizerError ? error.status : 502;
    return res.status(status).json({
      success: false,
      message: error instanceof SummarizerError
        ? error.message
        : "AI summarization failed. Please try again.",
    });
  }
});

// PATCH /api/documents/:id
// Owner or shared editor can update title/content.
router.patch("/:id", (req, res) => {
  const documentId = Number(req.params.id);
  const { title, content } = req.body;

  if (!Number.isInteger(documentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid document ID",
    });
  }

  if (content !== undefined && typeof content !== "string") {
    return res.status(400).json({
      success: false,
      message: "Content must be a string",
    });
  }

  if (title !== undefined && typeof title !== "string") {
    return res.status(400).json({
      success: false,
      message: "Title must be a string",
    });
  }

  const document = db
    .prepare(`
      SELECT
        d.id,
        d.title,
        d.content,
        d.owner_id,
        ds.permission AS shared_permission,
        ds.user_id AS shared_user_id
      FROM documents d
      LEFT JOIN document_shares ds
        ON ds.document_id = d.id
        AND ds.user_id = ?
      WHERE d.id = ?
        AND (
          d.owner_id = ?
          OR ds.user_id = ?
        )
    `)
    .get(req.user.id, documentId, req.user.id, req.user.id);

  if (!document) {
    return res.status(404).json({
      success: false,
      message: "Document not found or access denied",
    });
  }

  if (
    document.owner_id !== req.user.id &&
    document.shared_permission !== "edit"
  ) {
    return res.status(403).json({
      success: false,
      message: "This document is shared with view-only access",
    });
  }

  const updatedTitle =
    title !== undefined && title.trim()
      ? title.trim()
      : document.title;

  const updatedContent =
    content !== undefined
      ? content
      : document.content;

  db.prepare(`
    UPDATE documents
    SET
      title = ?,
      content = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(updatedTitle, updatedContent, documentId);

  const updatedDocument = db
    .prepare(`
      SELECT
        id,
        title,
        content,
        owner_id,
        created_at,
        updated_at
      FROM documents
      WHERE id = ?
    `)
    .get(documentId);

  res.json({
    success: true,
    document: updatedDocument,
  });
});

// POST /api/documents/:id/share
// Owner shares a document with another seeded user.
router.post("/:id/share", (req, res) => {
  const documentId = Number(req.params.id);
  const { email } = req.body;
  const permission = req.body.permission === undefined
    ? "edit"
    : req.body.permission;

  if (!Number.isInteger(documentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid document ID",
    });
  }

  if (!email || typeof email !== "string") {
    return res.status(400).json({
      success: false,
      message: "User email is required",
    });
  }

  if (!["edit", "view"].includes(permission)) {
    return res.status(400).json({
      success: false,
      message: "Permission must be either edit or view",
    });
  }

  const document = db
    .prepare(`
      SELECT id, owner_id
      FROM documents
      WHERE id = ?
    `)
    .get(documentId);

  if (!document) {
    return res.status(404).json({
      success: false,
      message: "Document not found",
    });
  }

  if (document.owner_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Only the document owner can share it",
    });
  }

  const targetUser = db
    .prepare(`
      SELECT id, name, email
      FROM users
      WHERE email = ?
    `)
    .get(email.trim());

  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (targetUser.id === req.user.id) {
    return res.status(400).json({
      success: false,
      message: "You cannot share a document with yourself",
    });
  }

  db.prepare(`
    INSERT INTO document_shares
      (document_id, user_id, permission)
    VALUES (?, ?, ?)
    ON CONFLICT(document_id, user_id)
    DO UPDATE SET permission = excluded.permission
  `).run(documentId, targetUser.id, permission);

  res.json({
    success: true,
    message: `Document shared with ${targetUser.name}`,
    sharedWith: targetUser,
    permission,
  });
});

// POST /api/documents/import
// Imports a DOCX file and creates an editable document.
router.post("/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "DOCX file is required",
      });
    }

    const isDocx =
      req.file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      req.file.originalname.toLowerCase().endsWith(".docx");

    if (!isDocx) {
      return res.status(400).json({
        success: false,
        message: "Only DOCX files are supported",
      });
    }

    const result = await mammoth.convertToHtml({
      buffer: req.file.buffer,
    });

    const html = result.value;

    const title =
      req.file.originalname.replace(/\.docx$/i, "").trim() ||
      "Imported document";

    const documentContent = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: html.replace(/<[^>]*>/g, "").trim(),
            },
          ],
        },
      ],
    });

    const insertResult = db
      .prepare(`
        INSERT INTO documents (title, content, owner_id)
        VALUES (?, ?, ?)
      `)
      .run(title, documentContent, req.user.id);

    const document = db
      .prepare(`
        SELECT
          id,
          title,
          content,
          owner_id,
          created_at,
          updated_at
        FROM documents
        WHERE id = ?
      `)
      .get(insertResult.lastInsertRowid);

    res.status(201).json({
      success: true,
      document,
      warnings: result.messages || [],
    });
  } catch (error) {
    console.error("DOCX import error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to import DOCX file",
    });
  }
});

module.exports = router;
