import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Focus from '@tiptap/extension-focus';
import Typography from '@tiptap/extension-typography';
import './InlineEditor.css';

const InlineEditor = forwardRef(({ 
  content, 
  onUpdate, 
  onFocus, 
  onBlur,
  placeholder = "Click to edit...",
  editable = true,
  className = ""
}, ref) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable some features for inline editing
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Placeholder.configure({
        placeholder: placeholder,
      }),
      Focus.configure({
        className: 'has-focus',
        mode: 'all',
      }),
      Typography,
    ],
    content: content,
    editable: editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (onUpdate) {
        onUpdate(html);
      }
    },
    onFocus: ({ editor }) => {
      if (onFocus) {
        onFocus(editor);
      }
    },
    onBlur: ({ editor }) => {
      if (onBlur) {
        onBlur(editor);
      }
    },
    editorProps: {
      attributes: {
        class: 'inline-editor-content',
      },
    },
  });

  // Update content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  // Expose editor instance to parent
  useImperativeHandle(ref, () => ({
    editor,
    getHTML: () => editor?.getHTML(),
    getText: () => editor?.getText(),
    setContent: (content) => editor?.commands.setContent(content),
    focus: () => editor?.commands.focus(),
    blur: () => editor?.commands.blur(),
  }), [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`inline-editor ${className}`}>
      <EditorContent editor={editor} />
    </div>
  );
});

InlineEditor.displayName = 'InlineEditor';

export default InlineEditor;
