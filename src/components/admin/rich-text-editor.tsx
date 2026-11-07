'use client';

import { useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { upload } from '@vercel/blob/client';
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { cn } from '@/lib/utils';

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40',
        active && 'bg-muted text-foreground',
      )}
    >
      {children}
    </button>
  );
}

/** Inline link field instead of window.prompt(). */
function LinkBar({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [href, setHref] = useState<string>(editor.getAttributes('link').href ?? '');

  function apply() {
    const value = href.trim();
    const chain = editor.chain().focus().extendMarkRange('link');
    if (!value) chain.unsetLink().run();
    else chain.setLink({ href: /^(https?:|mailto:|tel:|\/)/i.test(value) ? value : `https://${value}` }).run();
    onClose();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-2 py-2">
      <Input
        autoFocus
        value={href}
        onChange={(e) => setHref(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            apply();
          }
          if (e.key === 'Escape') onClose();
        }}
        placeholder="https://… (prazno = ukloni poveznicu)"
        className="h-8 max-w-md"
        aria-label="Adresa poveznice"
      />
      <Button type="button" size="sm" onClick={apply}>
        Primijeni
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onClose}>
        Odustani
      </Button>
    </div>
  );
}

/** Blog editor (tiptap). Inline images upload to Vercel Blob when uploads are enabled. */
export function RichTextEditor({
  content,
  onChange,
  uploadsEnabled,
}: {
  content: string;
  onChange: (html: string) => void;
  uploadsEnabled: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    // Toolbar active states are read straight from the editor on every transaction.
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true },
      }),
      Image,
      Placeholder.configure({ placeholder: 'Počnite pisati objavu…' }),
    ],
    content,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: { class: 'prose-article min-h-80 px-4 py-3 focus:outline-none', 'aria-label': 'Sadržaj objave' },
    },
  });

  async function insertImage(file: File) {
    if (!editor) return;
    setUploading(true);
    setUploadError(null);
    try {
      const blob = await upload(`blog/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]+/g, '-')}`, file, {
        access: 'public',
        handleUploadUrl: '/api/admin/upload',
        contentType: file.type,
      });
      editor.chain().focus().setImage({ src: blob.url, alt: '' }).run();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Učitavanje slike nije uspjelo.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (!editor) return <div className="min-h-96 animate-pulse rounded-md border bg-muted" />;

  const state = {
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    underline: editor.isActive('underline'),
    strike: editor.isActive('strike'),
    h2: editor.isActive('heading', { level: 2 }),
    h3: editor.isActive('heading', { level: 3 }),
    bullet: editor.isActive('bulletList'),
    ordered: editor.isActive('orderedList'),
    quote: editor.isActive('blockquote'),
    link: editor.isActive('link'),
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
  };

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-2 py-1">
        <ToolbarButton label="Naslov 2" active={state.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Naslov 3" active={state.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton label="Podebljano" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Kurziv" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Podcrtano" active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Precrtano" active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton label="Lista" active={state.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Numerirana lista" active={state.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Citat" active={state.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Poveznica" active={state.link || linkOpen} onClick={() => setLinkOpen((v) => !v)}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Linija" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </ToolbarButton>
        {uploadsEnabled && (
          <ToolbarButton label="Dodaj sliku" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          </ToolbarButton>
        )}
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton label="Poništi" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Ponovi" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
      {linkOpen && <LinkBar editor={editor} onClose={() => setLinkOpen(false)} />}
      {uploadError && <p className="border-b bg-destructive/10 px-3 py-2 text-sm text-destructive">{uploadError}</p>}
      <EditorContent editor={editor} />
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void insertImage(file);
        }}
      />
    </div>
  );
}
