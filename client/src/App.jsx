import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { api } from "./api.js";
import Toolbar from "./Toolbar.jsx";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

function readContent(value) {
  try {
    const content = JSON.parse(value);
    return content?.type === "doc" ? content : EMPTY_DOC;
  } catch {
    return EMPTY_DOC;
  }
}

function Brand({ compact = false }) {
  return (
    <div className={`brand${compact ? " compact" : ""}`}>
      <span className="brand-mark">a</span>
      <span>
        Ajaia<span className="brand-light"> Docs</span>
      </span>
    </div>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      await onLogin();
    } catch (requestError) {
      setError(
        requestError.message || "Unable to sign in. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-decoration">
        <div className="decoration-orbit orbit-one" />
        <div className="decoration-orbit orbit-two" />
        <div className="decoration-card">
          <span className="decoration-line wide" />
          <span className="decoration-line" />
          <span className="decoration-line short" />
          <span className="decoration-highlight" />
        </div>
      </div>

      <section className="login-panel">
        <Brand />

        <div className="login-copy">
          <p className="eyebrow">YOUR SPACE TO THINK</p>

          <h1>
            Good ideas deserve
            <br />
            a great home.
          </h1>

          <p>Sign in to pick up where your thinking left off.</p>
        </div>

        <form className="login-form" onSubmit={submit}>
          <label htmlFor="email">Email address</label>

          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="primary-button login-button"
            type="submit"
            disabled={busy}
          >
            {busy ? "Signing in…" : "Sign in"}
            <span aria-hidden="true">→</span>
          </button>
        </form>

        <p className="login-footnote">A calmer place for your work.</p>
      </section>
    </main>
  );
}

function ToolbarButton({ children, className = "", ...props }) {
  return (
    <button
      className={`icon-button ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [title, setTitle] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState("edit");
  const [sharing, setSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [documentSearch, setDocumentSearch] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryError, setSummaryError] = useState("");

  const currentDocumentId = useRef(null);
  const currentRevision = useRef(0);
  const fileInputRef = useRef(null);

  const canEditActiveDocument = Boolean(
    activeDocument &&
      (activeDocument.access_type === "owner" ||
        activeDocument.access?.permission === "edit")
  );

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: EMPTY_DOC,
    editable: canEditActiveDocument && !loadingDocument,

    onUpdate: () => {
      setRevision((value) => {
        const next = value + 1;
        currentRevision.current = next;
        return next;
      });

      setSaveStatus("Saving...");
    },

    editorProps: {
      attributes: {
        class: "editor-content",
        "aria-label": "Document content",
      },
    },
  });

  const loadDocuments = useCallback(async () => {
    setLoadingList(true);

    try {
      const result = await api("/documents");

      const nextDocuments = result.documents || [];
      setDocuments(nextDocuments);
      setError("");
      return nextDocuments;
    } catch (requestError) {
      setError(
        requestError.status === 401
          ? "Your session expired. Please sign in again."
          : requestError.message
      );

      if (requestError.status === 401) {
        setUser(null);
      }
      return null;
    } finally {
      setLoadingList(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const result = await api("/auth/me");

    setUser(result.user);

    return result.user;
  }, []);

  useEffect(() => {
    refreshUser()
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, [refreshUser]);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user, loadDocuments]);

  const openDocument = useCallback(
    async (id) => {
      setLoadingDocument(true);
      setError("");
      setShareMessage("");
      setShareEmail("");
      setSummary("");
      setSummaryError("");
      setActiveDocument(null);
      currentDocumentId.current = null;

      try {
        const result = await api(`/documents/${id}`);
        const document = result.document;

        setActiveDocument(document);
        currentDocumentId.current = document.id;
        setTitle(document.title);

        setRevision(0);
        currentRevision.current = 0;

        editor?.commands.setContent(readContent(document.content), {
          emitUpdate: false,
        });

        setSaveStatus("Saved");
      } catch (requestError) {
        setError(
          requestError.status === 401
            ? "Your session expired. Please sign in again."
            : requestError.message
        );

        if (requestError.status === 401) {
          setUser(null);
        }
      } finally {
        setLoadingDocument(false);
      }
    },
    [editor]
  );

  useEffect(() => {
    if (activeDocument && editor) {
      editor.setEditable(!loadingDocument && canEditActiveDocument);
    }
  }, [activeDocument, canEditActiveDocument, editor, loadingDocument]);

  useEffect(() => {
    if (!activeDocument || !editor || loadingDocument || !canEditActiveDocument) {
      return undefined;
    }

    const documentId = activeDocument.id;
    const revisionAtSchedule = currentRevision.current;
    const content = JSON.stringify(editor.getJSON());
    const titleAtSchedule = title.trim() || "Untitled document";

    const timer = window.setTimeout(async () => {
      setSaveStatus("Saving...");

      try {
        const result = await api(`/documents/${documentId}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: titleAtSchedule,
            content,
          }),
        });

        setActiveDocument((current) =>
          current?.id === documentId
            ? { ...current, ...result.document }
            : current
        );

        setDocuments((current) =>
          current.map((item) =>
            item.id === documentId
              ? {
                  ...item,
                  title: titleAtSchedule,
                  updated_at: result.document.updated_at,
                }
              : item
          )
        );

        if (
          currentDocumentId.current === documentId &&
          currentRevision.current === revisionAtSchedule
        ) {
          setSaveStatus("Saved");
        }
      } catch (requestError) {
        if (
          currentDocumentId.current === documentId &&
          currentRevision.current === revisionAtSchedule
        ) {
          setSaveStatus("Save failed");

          setError(
            requestError.status === 401
              ? "Your session expired. Please sign in again."
              : requestError.message
          );

          if (requestError.status === 401) {
            setUser(null);
          }
        }
      }
    }, 800);

    return () => window.clearTimeout(timer);
  }, [activeDocument?.id, canEditActiveDocument, editor, loadingDocument, revision, title]);

  async function createDocument() {
    setCreating(true);
    setError("");

    try {
      const result = await api("/documents", {
        method: "POST",
        body: JSON.stringify({
          title: "Untitled document",
        }),
      });

      await loadDocuments();
      await openDocument(result.document.id);

      setSidebarOpen(false);
    } catch (requestError) {
      setError(requestError.message || "Could not create document.");
    } finally {
      setCreating(false);
    }
  }

  async function importDocument(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const isDocx =
      file.name.toLowerCase().endsWith(".docx") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (!isDocx) {
      setError("Only DOCX files are supported.");
      event.target.value = "";
      return;
    }

    setImporting(true);
    setError("");
    setShareMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await api("/documents/import", {
        method: "POST",
        body: formData,
      });

      await loadDocuments();
      await openDocument(result.document.id);

      setSidebarOpen(false);
    } catch (requestError) {
      setError(
        requestError.message || "Could not import the DOCX document."
      );
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  }

  async function shareDocument() {
    if (!activeDocument || activeDocument.access_type !== "owner") {
      return;
    }

    if (!shareEmail.trim()) {
      setShareMessage("Enter a user's email address.");
      return;
    }

    setSharing(true);
    setShareMessage("");

    try {
      await api(`/documents/${activeDocument.id}/share`, {
        method: "POST",
        body: JSON.stringify({
          email: shareEmail.trim(),
          permission: sharePermission,
        }),
      });

      setShareMessage("Document shared successfully.");
      setShareEmail("");
      try {
        const result = await api(`/documents/${activeDocument.id}`);
        setActiveDocument((current) =>
          current?.id === activeDocument.id
            ? { ...current, access: result.document.access }
            : current
        );
      } catch {
        // The share succeeded; keep the success state if refreshing its details fails.
      }
    } catch (requestError) {
      setShareMessage(
        requestError.message || "Could not share this document."
      );
    } finally {
      setSharing(false);
    }
  }

  async function duplicateDocument() {
    if (!activeDocument) return;

    setError("");
    try {
      const result = await api(`/documents/${activeDocument.id}/duplicate`, {
        method: "POST",
      });
      await loadDocuments();
      await openDocument(result.document.id);
      setSidebarOpen(false);
    } catch (requestError) {
      setError(requestError.message || "Could not duplicate this document.");
    }
  }

  async function deleteDocument() {
    if (!activeDocument || activeDocument.access_type !== "owner") return;

    const confirmed = window.confirm(
      `Permanently delete "${activeDocument.title}"? This cannot be undone.`
    );
    if (!confirmed) return;

    const deletedId = activeDocument.id;
    setError("");
    try {
      await api(`/documents/${deletedId}`, { method: "DELETE" });
      setActiveDocument(null);
      currentDocumentId.current = null;
      setTitle("");
      editor?.commands.setContent(EMPTY_DOC, { emitUpdate: false });

      const remaining = await loadDocuments();
      if (remaining?.length) {
        await openDocument(remaining[0].id);
      }
    } catch (requestError) {
      setError(requestError.message || "Could not delete this document.");
    }
  }

  async function summarizeDocument() {
    if (!activeDocument || !editor) return;

    setSummary("");
    setSummaryError("");
    const currentText = editor.getText().trim();
    if (!currentText) {
      setSummaryError("This document has no text to summarize.");
      return;
    }

    const documentId = activeDocument.id;
    setSummarizing(true);
    setSaveStatus("Saving...");
    try {
      await api(`/documents/${activeDocument.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim() || "Untitled document",
          content: JSON.stringify(editor.getJSON()),
        }),
      });
      if (currentDocumentId.current === documentId) {
        setSaveStatus("Saved");
      }

    } catch (requestError) {
      if (currentDocumentId.current === documentId) {
        setSaveStatus("Save failed");
        setSummaryError(requestError.message || "Could not save before summarizing.");
      }
      setSummarizing(false);
      return;
    }

    if (currentDocumentId.current !== documentId) {
      setSummarizing(false);
      return;
    }

    try {
      const result = await api(`/documents/${documentId}/summarize`, {
        method: "POST",
      });
      if (currentDocumentId.current === documentId) {
        setSummary(result.summary);
      }
    } catch (requestError) {
      if (currentDocumentId.current === documentId) {
        setSummaryError(requestError.message || "Could not summarize this document.");
      }
    } finally {
      setSummarizing(false);
    }
  }

  async function logout() {
    try {
      await api("/auth/logout", {
        method: "POST",
      });
    } finally {
      setUser(null);
      setDocuments([]);
      setActiveDocument(null);
      currentDocumentId.current = null;
      setTitle("");
      setShareEmail("");
      setShareMessage("");
    }
  }

  if (authLoading) {
    return (
      <div className="splash">
        <Brand />
        <span className="loading-dot" />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={refreshUser} />;
  }

  const owned = documents.filter(
    (document) => document.access_type === "owner"
  );

  const shared = documents.filter(
    (document) => document.access_type === "shared"
  );
  const normalizedSearch = documentSearch.trim().toLocaleLowerCase();
  const visibleOwned = owned.filter((document) =>
    document.title.toLocaleLowerCase().includes(normalizedSearch)
  );
  const visibleShared = shared.filter((document) =>
    document.title.toLocaleLowerCase().includes(normalizedSearch)
  );
  const visibleDocumentCount = visibleOwned.length + visibleShared.length;
  const editorText = editor?.getText() || "";
  const wordCount = editorText.trim()
    ? editorText.trim().split(/\s+/u).filter(Boolean).length
    : 0;
  const characterCount = editorText.length;

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="mobile-scrim"
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`sidebar${sidebarOpen ? " sidebar-open" : ""}`}
      >
        <div className="sidebar-top">
          <Brand compact />

          <ToolbarButton
            className="sidebar-collapse"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </ToolbarButton>
        </div>

        <button
          className="new-document"
          type="button"
          onClick={createDocument}
          disabled={creating}
        >
          <span className="plus">＋</span>
          {creating ? "Creating…" : "New document"}
          <span className="new-shortcut">⌘ N</span>
        </button>

        <button
          className="import-document"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          <span className="import-icon">↑</span>
          {importing ? "Importing…" : "Import DOCX"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={importDocument}
          hidden
        />

        <label className="document-search">
          <SearchIcon />
          <input
            type="search"
            value={documentSearch}
            onChange={(event) => setDocumentSearch(event.target.value)}
            placeholder="Search documents"
            aria-label="Search documents by title"
          />
        </label>

        <nav className="document-nav" aria-label="Documents">
          {loadingList ? (
            <div className="nav-message">
              <span className="loading-dot" />
              Loading documents…
            </div>
          ) : visibleDocumentCount === 0 ? (
            <div className="empty-list">
              {documents.length === 0
                ? "Your documents will show up here."
                : "No documents match your search."}
            </div>
          ) : (
            <>
              {visibleOwned.length > 0 && (
                <DocumentSection
                  title="MY DOCUMENTS"
                  documents={visibleOwned}
                  activeId={activeDocument?.id}
                  onOpen={openDocument}
                  onOpened={() => setSidebarOpen(false)}
                />
              )}

              {visibleShared.length > 0 && (
                <DocumentSection
                  title="SHARED WITH ME"
                  documents={visibleShared}
                  activeId={activeDocument?.id}
                  onOpen={openDocument}
                  onOpened={() => setSidebarOpen(false)}
                />
              )}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="avatar">
            {user.name?.trim()?.[0]?.toUpperCase() || "U"}
          </div>

          <div className="user-meta">
            <span className="user-name">{user.name}</span>
            <span className="user-email">{user.email}</span>
          </div>

          <ToolbarButton
            className="logout-button"
            aria-label="Log out"
            title="Log out"
            onClick={logout}
          >
            <LogoutIcon />
          </ToolbarButton>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <ToolbarButton
              className="menu-toggle"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <MenuIcon />
            </ToolbarButton>

            <span className="breadcrumb-muted">Workspace</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">
              {activeDocument?.title || "Documents"}
            </span>
          </div>

          <div className="topbar-right">
            <span
              className={`save-indicator ${
                saveStatus === "Save failed" ? "save-error" : ""
              }`}
            >
              <span className="save-dot" />
              {saveStatus}
            </span>

            <span className="topbar-avatar">
              {user.name?.trim()?.[0]?.toUpperCase() || "U"}
            </span>
          </div>
        </header>

        {activeDocument &&
          activeDocument.access_type === "owner" && (
            <div className="share-panel">
              <div className="share-panel-label">
                <strong>Share document</strong>
                <span>Choose what access to give</span>
              </div>

              <input
                type="email"
                aria-label="User email to share with"
                placeholder="bob@example.com"
                value={shareEmail}
                onChange={(event) => {
                  setShareEmail(event.target.value);
                  setShareMessage("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    shareDocument();
                  }
                }}
              />

              <select
                className="share-permission"
                aria-label="Sharing permission"
                value={sharePermission}
                onChange={(event) => setSharePermission(event.target.value)}
              >
                <option value="edit">Can edit</option>
                <option value="view">Can view</option>
              </select>

              <button
                className="primary-button share-button"
                type="button"
                onClick={shareDocument}
                disabled={sharing}
              >
                {sharing ? "Sharing…" : "Share"}
              </button>

              {shareMessage && (
                <span
                  className={`share-message ${
                    shareMessage.includes("successfully")
                      ? "share-success"
                      : "share-error"
                  }`}
                >
                  {shareMessage}
                </span>
              )}
            </div>
          )}

        {activeDocument && (
          <div className="document-action-bar">
            <div className="document-access">
              <span className="access-heading">ACCESS</span>
              <span>
                Owner: {activeDocument.access?.owner?.name || "Unknown"}
              </span>
              {activeDocument.access_type === "owner" ? (
                activeDocument.access?.sharedWith?.length ? (
                  <span>
                    Shared with: {activeDocument.access.sharedWith
                      .map((person) => `${person.name} — ${person.permission === "view" ? "Can view" : "Can edit"}`)
                      .join(", ")}
                  </span>
                ) : (
                  <span>Private — only you can access this document.</span>
                )
              ) : (
                <span>
                  Your access: {activeDocument.access?.permission === "view"
                    ? "Can view"
                    : "Can edit"}
                </span>
              )}
            </div>
            <div className="document-actions">
              <button type="button" onClick={duplicateDocument}>Duplicate</button>
              <button type="button" onClick={summarizeDocument} disabled={summarizing}>
                {summarizing ? "Summarizing..." : "AI Summarize"}
              </button>
              {activeDocument.access_type === "owner" && (
                <button className="delete-action" type="button" onClick={deleteDocument}>Delete</button>
              )}
            </div>
          </div>
        )}

        {(summary || summaryError) && (
          <section className="summary-card" aria-live="polite">
            <div className="summary-card-header">
              <strong>Document summary</strong>
              <button type="button" onClick={() => { setSummary(""); setSummaryError(""); }} aria-label="Close summary">×</button>
            </div>
            {summaryError ? <p className="summary-error">{summaryError}</p> : <p>{summary}</p>}
          </section>
        )}

        {error && (
          <div className="app-alert" role="alert">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {loadingDocument ? (
          <div className="editor-loading">
            <span className="loading-dot" />
            Opening document…
          </div>
        ) : activeDocument ? (
          <section className="editor-workspace">
            <div className="document-header">
              <div className="document-overline">
                <span className="document-icon">
                  <DocumentIcon />
                </span>

                <span>
                  {activeDocument.access_type === "shared"
                    ? "SHARED DOCUMENT"
                    : "YOUR DOCUMENT"}
                </span>
              </div>

              <input
                className="title-input"
                aria-label="Document title"
                value={title}
                readOnly={!canEditActiveDocument}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setSaveStatus("Saving...");
                }}
                onBlur={() => {
                  if (!title.trim()) {
                    setTitle("Untitled document");
                  }
                }}
                placeholder="Untitled document"
              />

              <p className="document-subtitle">
                A quiet space for your next great idea.
              </p>
            </div>

            <div className="editor-card">
              {canEditActiveDocument && <Toolbar editor={editor} />}
              <EditorContent editor={editor} />
            </div>

            <p className="editor-hint">
              <span>Changes save automatically</span>
              <span>Words: {wordCount} <span className="stats-divider">·</span> Characters: {characterCount}</span>
            </p>
          </section>
        ) : (
          <section className="welcome-state">
            <div className="welcome-symbol">
              <DocumentIcon />
            </div>

            <p className="eyebrow">
              WELCOME BACK,{" "}
              {user.name?.split(" ")[0]?.toUpperCase()}
            </p>

            <h1>
              Your thoughts,
              <br />
              all in one place.
            </h1>

            <p>
              Choose a document from the sidebar or start something new.
            </p>

            <button
              className="primary-button"
              type="button"
              onClick={createDocument}
              disabled={creating}
            >
              <span>＋</span>
              {creating ? "Creating…" : "Create a document"}
            </button>
          </section>
        )}

        <footer className="workspace-footer">
          <span>Thoughtfully made for your work</span>
          <span className="footer-divider">·</span>
          <span>Ajaia Docs</span>
        </footer>
      </main>
    </div>
  );
}

function DocumentSection({
  title,
  documents,
  activeId,
  onOpen,
  onOpened,
}) {
  return (
    <section className="doc-section">
      <h2>{title}</h2>

      <ul>
        {documents.map((document) => (
          <li key={document.id}>
            <button
              className={`document-item${
                activeId === document.id ? " selected" : ""
              }`}
              type="button"
              onClick={() => {
                onOpen(document.id);
                onOpened();
              }}
            >
              <DocumentIcon />

              <span className="document-item-title">
                {document.title || "Untitled document"}
              </span>

              {title === "SHARED WITH ME" && (
                <span
                  className="shared-dot"
                  title="Shared with you"
                />
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5.5 2.75h6l3.25 3.3v10.2H5.5z" />
      <path d="M11.5 2.9v3.5H15M8 9.5h4.5M8 12h4.5" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M8 3.5H4.5v13H8M11 6l4 4-4 4M15 10H7" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.25" />
      <path d="m12.5 12.5 4 4" />
    </svg>
  );
}
