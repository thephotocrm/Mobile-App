/**
 * Utility functions for converting between ContentBlock[] format and
 * plain text with button markers format.
 *
 * This enables the simplified email editor (ButtonRichTextEditor) to work
 * with templates that were previously created using the visual blocks builder.
 */

export type ContentBlock = {
  id: string;
  type: 'HEADING' | 'TEXT' | 'BUTTON' | 'IMAGE' | 'SPACER' | 'HEADER' | 'SIGNATURE';
  content: any;
};

// Button marker format: [[BUTTON:LINKTYPE:ButtonText]] or [[BUTTON:CUSTOM:ButtonText:url]]
const BUTTON_MARKER_REGEX = /\[\[BUTTON:([A-Z_]+):([^\]]+?)(?::([^\]]+))?\]\]/g;

/**
 * Convert ContentBlock[] to plain text with button markers.
 * Used when loading templates created with the old blocks builder.
 */
export function blocksToTemplateBody(blocks: ContentBlock[] | Array<{ type: string; content: any }>): string {
  if (!blocks || blocks.length === 0) return '';

  return blocks.map(block => {
    switch (block.type) {
      case 'HEADING':
        // Convert heading to bold text - handle both object format and plain string
        const headingText = typeof block.content === 'string'
          ? block.content
          : (block.content?.text || block.content?.content || '');
        return headingText ? `**${headingText}**` : '';

      case 'TEXT':
        // Plain text content - handle both object format {text: "..."} and plain string format
        if (typeof block.content === 'string') {
          return block.content;
        }
        return block.content?.text || block.content?.content || '';

      case 'BUTTON':
        // Convert to button marker format
        const { text, linkType, linkValue, url } = block.content || {};
        const buttonText = (text || 'Click Here').replace(/[\[\]:]/g, '');
        const actualLinkType = linkType || 'CALENDAR';
        const actualUrl = linkValue || url || '';

        if (actualLinkType === 'CUSTOM' && actualUrl) {
          return `[[BUTTON:CUSTOM:${buttonText}:${actualUrl}]]`;
        }
        return `[[BUTTON:${actualLinkType}:${buttonText}]]`;

      case 'SPACER':
        // Convert spacer to blank lines
        return '\n';

      case 'IMAGE':
        // Images are skipped in simplified editor
        // Could optionally add placeholder: return '[Image]';
        return '';

      case 'HEADER':
      case 'SIGNATURE':
        // These are handled via includeHeader/includeFooter toggles
        return '';

      default:
        return '';
    }
  }).filter(Boolean).join('\n\n');
}

/**
 * Parse plain text with button markers into ContentBlock[] format.
 * Used when saving templates to maintain compatibility with rendering.
 */
export function parseTemplateBodyToBlocks(templateBody: string): ContentBlock[] {
  if (!templateBody || !templateBody.trim()) return [];

  const blocks: ContentBlock[] = [];
  let lastIndex = 0;
  let match;
  const regex = new RegExp(BUTTON_MARKER_REGEX.source, 'g');
  let blockIndex = 0;

  while ((match = regex.exec(templateBody)) !== null) {
    // Add text before this button marker
    if (match.index > lastIndex) {
      const textContent = templateBody.substring(lastIndex, match.index).trim();
      if (textContent) {
        blocks.push({
          id: `block-${blockIndex++}`,
          type: 'TEXT',
          content: { text: textContent }
        });
      }
    }

    // Add the button block
    const linkType = match[1];
    const buttonText = match[2];
    const customUrl = match[3] || '';

    blocks.push({
      id: `block-${blockIndex++}`,
      type: 'BUTTON',
      content: {
        text: buttonText,
        linkType: linkType,
        linkValue: linkType === 'CUSTOM' ? customUrl : ''
      }
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last button
  if (lastIndex < templateBody.length) {
    const textContent = templateBody.substring(lastIndex).trim();
    if (textContent) {
      blocks.push({
        id: `block-${blockIndex++}`,
        type: 'TEXT',
        content: { text: textContent }
      });
    }
  }

  // If no buttons found, return single text block
  if (blocks.length === 0 && templateBody.trim()) {
    blocks.push({
      id: 'block-0',
      type: 'TEXT',
      content: { text: templateBody }
    });
  }

  return blocks;
}

/**
 * Check if content is in blocks format or plain text format.
 */
export function isBlocksFormat(content: any): content is ContentBlock[] {
  return Array.isArray(content) && content.length > 0 &&
    typeof content[0] === 'object' && 'type' in content[0];
}

/**
 * Normalize content to plain text format.
 * Handles both blocks format and plain text.
 */
export function normalizeToTemplateBody(content: ContentBlock[] | string | null | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (isBlocksFormat(content)) return blocksToTemplateBody(content);
  return '';
}

/**
 * HTML escape helper to prevent XSS.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate HTML email body from templateBody string.
 * Converts text with [[BUTTON:...]] markers to styled HTML.
 * Used when saving emails to generate the htmlBody field.
 */
export function templateBodyToHtml(templateBody: string): string {
  if (!templateBody || !templateBody.trim()) return '';

  let html = '';
  let lastIndex = 0;
  let match;
  const regex = new RegExp(BUTTON_MARKER_REGEX.source, 'g');

  while ((match = regex.exec(templateBody)) !== null) {
    // Add text before button (with paragraph wrapping)
    if (match.index > lastIndex) {
      const text = templateBody.substring(lastIndex, match.index).trim();
      if (text) {
        // Split by double newlines for paragraphs
        const paragraphs = text.split(/\n\n+/).filter(Boolean);
        paragraphs.forEach(p => {
          // Replace single newlines with <br> within paragraphs
          const escaped = escapeHtml(p).replace(/\n/g, '<br>');
          html += `<p>${escaped}</p>`;
        });
      }
    }

    // Add button HTML
    const linkType = match[1];
    const buttonText = escapeHtml(match[2]);
    const customUrl = match[3] || '';

    let url = '#';
    if (linkType === 'SMART_FILE') {
      url = '{{smart_file_link}}';
    } else if (linkType === 'GALLERY') {
      url = '{{gallery_link}}';
    } else if (linkType === 'CALENDAR') {
      url = '{{calendar_link}}';
    } else if (linkType === 'CUSTOM' && customUrl) {
      url = escapeHtml(customUrl);
    }

    html += `<a href="${url}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">${buttonText}</a>`;

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last button
  if (lastIndex < templateBody.length) {
    const text = templateBody.substring(lastIndex).trim();
    if (text) {
      const paragraphs = text.split(/\n\n+/).filter(Boolean);
      paragraphs.forEach(p => {
        const escaped = escapeHtml(p).replace(/\n/g, '<br>');
        html += `<p>${escaped}</p>`;
      });
    }
  }

  return html;
}
