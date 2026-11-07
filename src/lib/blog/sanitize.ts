import sanitizeHtml from 'sanitize-html';

/**
 * Allow-list for blog HTML from the admin editor (tiptap StarterKit + Image).
 * Stored sanitised, so the public page can render it as-is.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'h2',
    'h3',
    'h4',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'code',
    'pre',
    'blockquote',
    'ul',
    'ol',
    'li',
    'hr',
    'a',
    'img',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
  },
  allowedSchemes: ['https', 'http', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['https', 'http'] },
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => {
      const external = /^https?:\/\//i.test(attribs.href ?? '');
      return {
        tagName,
        attribs: external ? { ...attribs, target: '_blank', rel: 'noopener noreferrer' } : attribs,
      };
    },
  },
};

export function sanitizeBlogHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS).trim();
}

/** Plain text (for excerpts / meta descriptions). */
export function htmlToText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
}
