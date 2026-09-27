import { useEditorState } from "@tiptap/react";

const controls = [
  { label: "Bold", mark: "bold", icon: <strong>B</strong>, action: (editor) => editor.chain().focus().toggleBold().run() },
  { label: "Italic", mark: "italic", icon: <em>I</em>, action: (editor) => editor.chain().focus().toggleItalic().run() },
  { label: "Underline", mark: "underline", icon: <u>U</u>, action: (editor) => editor.chain().focus().toggleUnderline().run() },
];

export default function Toolbar({ editor }) {
  const editorState = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      underline: current.isActive("underline"),
      h1: current.isActive("heading", { level: 1 }),
      h2: current.isActive("heading", { level: 2 }),
      bullet: current.isActive("bulletList"),
      ordered: current.isActive("orderedList"),
    }),
  });

  if (!editor || !editorState) return null;
  const button = (label, active, onClick, icon) => (
    <button className={`tool-button${active ? " active" : ""}`} type="button" aria-label={label} title={label} onClick={onClick}>
      {icon}
    </button>
  );

  return (
    <div className="toolbar" role="toolbar" aria-label="Document formatting">
      <div className="toolbar-group">
        {button("Paragraph", editor.isActive("paragraph"), () => editor.chain().focus().setParagraph().run(), <span className="paragraph-icon">¶</span>)}
        {button("Heading 1", editorState.h1, () => editor.chain().focus().toggleHeading({ level: 1 }).run(), <span className="heading-icon">H1</span>)}
        {button("Heading 2", editorState.h2, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <span className="heading-icon">H2</span>)}
      </div>
      <span className="tool-divider" />
      <div className="toolbar-group">
        {controls.map((control) => button(control.label, editorState[control.mark], control.action.bind(null, editor), control.icon))}
      </div>
      <span className="tool-divider" />
      <div className="toolbar-group">
        {button("Bulleted list", editorState.bullet, () => editor.chain().focus().toggleBulletList().run(), <span className="list-icon">☷</span>)}
        {button("Numbered list", editorState.ordered, () => editor.chain().focus().toggleOrderedList().run(), <span className="list-icon">≡</span>)}
      </div>
    </div>
  );
}
