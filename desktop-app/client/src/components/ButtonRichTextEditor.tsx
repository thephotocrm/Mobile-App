import {
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useState,
} from "react";
import { X } from "lucide-react";

// Button marker regex: [[BUTTON:LINKTYPE:ButtonText]] or [[BUTTON:CUSTOM:ButtonText:url]]
const BUTTON_MARKER_REGEX = /\[\[BUTTON:([A-Z_]+):([^\]]+?)(?::([^\]]+))?\]\]/g;

// Button destination labels for display
const BUTTON_DESTINATION_LABELS: Record<string, string> = {
  CALENDAR: "Calendar",
  SMART_FILE: "Proposal",
  GALLERY: "Gallery",
  TESTIMONIALS: "Review",
  CUSTOM: "Link",
};

interface ButtonRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  maxHeight?: string;
  onOpenButtonModal?: () => void;
  onEditButton?: (data: {
    marker: string;
    text: string;
    linkType: string;
    customUrl?: string;
  }) => void;
}

// Convert token-based string to HTML with chip elements
function tokenToHtml(tokenString: string): string {
  if (!tokenString) return "";

  // Escape HTML entities in the text
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\n/g, "<br>");
  };

  let html = "";
  let lastIndex = 0;
  let match;
  const regex = new RegExp(BUTTON_MARKER_REGEX.source, "g");

  while ((match = regex.exec(tokenString)) !== null) {
    // Add text before this marker (escaped)
    if (match.index > lastIndex) {
      const textBefore = tokenString.substring(lastIndex, match.index);
      html += escapeHtml(textBefore);
    }

    // Add chip element
    const linkType = match[1];
    const buttonText = match[2];
    const customUrl = match[3] || "";
    const fullMarker = match[0];

    // Create non-editable chip with data attributes
    html += `<span contenteditable="false" class="button-chip" data-button-marker="${encodeURIComponent(fullMarker)}" data-link-type="${linkType}" data-button-text="${encodeURIComponent(buttonText)}" data-custom-url="${encodeURIComponent(customUrl)}"><span class="chip-content">${escapeHtml(buttonText)}</span><span class="chip-delete" data-action="delete">×</span></span>`;

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < tokenString.length) {
    html += escapeHtml(tokenString.substring(lastIndex));
  }

  return html;
}

// Convert HTML with chip elements back to token string
function htmlToToken(container: HTMLElement): string {
  let result = "";

  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;

      if (element.tagName === "BR") {
        result += "\n";
      } else if (element.classList.contains("button-chip")) {
        // Get the original marker from data attribute
        const marker = decodeURIComponent(
          element.getAttribute("data-button-marker") || "",
        );
        result += marker;
      } else if (
        element.tagName === "DIV" &&
        result.length > 0 &&
        !result.endsWith("\n")
      ) {
        // DIVs in contenteditable often represent new lines
        result += "\n";
        element.childNodes.forEach(processNode);
      } else {
        // Process children
        element.childNodes.forEach(processNode);
      }
    }
  };

  container.childNodes.forEach(processNode);

  // Clean up trailing/leading whitespace from HTML quirks
  return result.replace(/\n$/, "");
}

export function ButtonRichTextEditor({
  value,
  onChange,
  placeholder = "Write your message...",
  className = "",
  minHeight = "150px",
  maxHeight,
  onOpenButtonModal,
  onEditButton,
}: ButtonRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingFromProp = useRef(false);
  const [isFocused, setIsFocused] = useState(false);

  // Store current selection for button insertion
  const savedSelectionRef = useRef<{ node: Node; offset: number } | null>(null);

  // Track value for comparison to avoid update loops
  const prevValueRef = useRef<string | null>(null);

  // Update editor content when value prop changes from external source
  // Using useLayoutEffect ensures DOM updates happen synchronously before paint
  useLayoutEffect(() => {
    if (!editorRef.current) return;

    // Always update on mount or when value actually changes
    const shouldUpdate =
      prevValueRef.current === null || prevValueRef.current !== value;

    if (shouldUpdate) {
      isUpdatingFromProp.current = true;
      const newHtml = tokenToHtml(value) || "";
      editorRef.current.innerHTML = newHtml;
      prevValueRef.current = value;
      isUpdatingFromProp.current = false;
    }
  }, [value]);

  // Force re-render when value contains button markers but editor shows plain text
  // This catches cases where the tokenToHtml conversion didn't apply (e.g., after AI generation)
  useEffect(() => {
    const checkAndConvert = () => {
      if (!editorRef.current || !value) return;

      // Check if value has button markers
      const hasButtonMarkers = /\[\[BUTTON:[A-Z_]+:[^\]]+\]\]/.test(value);
      if (!hasButtonMarkers) return;

      // Check if editor is showing plain text markers instead of chips
      const editorText = editorRef.current.textContent || "";
      const hasPlainTextMarkers = /\[\[BUTTON:[A-Z_]+:[^\]]+\]\]/.test(
        editorText,
      );
      const hasChips = editorRef.current.querySelector(".button-chip") !== null;

      // If we have markers in value but they're showing as plain text (no chips), force update
      if (hasPlainTextMarkers && !hasChips) {
        console.log(
          "[ButtonRichTextEditor] Forcing chip conversion - detected plain text markers",
        );
        isUpdatingFromProp.current = true;
        editorRef.current.innerHTML = tokenToHtml(value) || "";
        prevValueRef.current = value;
        isUpdatingFromProp.current = false;
      }
    };

    // Check immediately
    checkAndConvert();

    // Also check after a short delay in case React batched updates cause timing issues
    const timer = setTimeout(checkAndConvert, 100);
    return () => clearTimeout(timer);
  }, [value]);

  // Fallback: ensure content is set after mount if useLayoutEffect missed it
  useEffect(() => {
    const timer = setTimeout(() => {
      if (editorRef.current && value && !editorRef.current.innerHTML.trim()) {
        editorRef.current.innerHTML = tokenToHtml(value) || "";
        prevValueRef.current = value;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [value]);

  // Handle input changes
  const handleInput = useCallback(() => {
    if (isUpdatingFromProp.current || !editorRef.current) return;

    const tokenValue = htmlToToken(editorRef.current);
    prevValueRef.current = tokenValue; // Keep in sync to prevent re-setting during typing
    onChange(tokenValue);
  }, [onChange]);

  // Handle click events (for chip delete and edit)
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if clicking the delete button on a chip
      if (
        target.classList.contains("chip-delete") ||
        target.getAttribute("data-action") === "delete"
      ) {
        e.preventDefault();
        e.stopPropagation();

        const chip = target.closest(".button-chip");
        if (chip && editorRef.current) {
          chip.remove();
          handleInput();
          editorRef.current.focus();
        }
        return;
      }

      // Check if clicking the chip body (for editing)
      const chip = target.closest(".button-chip") as HTMLElement;
      if (chip && onEditButton) {
        e.preventDefault();
        e.stopPropagation();

        const marker = decodeURIComponent(
          chip.getAttribute("data-button-marker") || "",
        );
        const text = decodeURIComponent(
          chip.getAttribute("data-button-text") || "",
        );
        const linkType = chip.getAttribute("data-link-type") || "CALENDAR";
        const customUrl = decodeURIComponent(
          chip.getAttribute("data-custom-url") || "",
        );

        onEditButton({ marker, text, linkType, customUrl });
      }
    },
    [handleInput, onEditButton],
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!editorRef.current) return;

      // Handle Backspace/Delete around chips
      if (e.key === "Backspace" || e.key === "Delete") {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);

        // If selection is collapsed (cursor, not selection)
        if (range.collapsed) {
          const node = range.startContainer;
          const offset = range.startOffset;

          // Check if we're right before or after a chip
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            const children = Array.from(element.childNodes);

            if (e.key === "Backspace" && offset > 0) {
              const prevNode = children[offset - 1];
              if (
                prevNode &&
                (prevNode as HTMLElement).classList?.contains("button-chip")
              ) {
                e.preventDefault();
                prevNode.parentNode?.removeChild(prevNode);
                handleInput();
                return;
              }
            }

            if (e.key === "Delete" && offset < children.length) {
              const nextNode = children[offset];
              if (
                nextNode &&
                (nextNode as HTMLElement).classList?.contains("button-chip")
              ) {
                e.preventDefault();
                nextNode.parentNode?.removeChild(nextNode);
                handleInput();
                return;
              }
            }
          }
        }
      }
    },
    [handleInput],
  );

  // Save selection when losing focus (for button insertion)
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current) {
      const range = selection.getRangeAt(0);
      if (editorRef.current.contains(range.startContainer)) {
        savedSelectionRef.current = {
          node: range.startContainer,
          offset: range.startOffset,
        };
      }
    }
  }, []);

  // Explicitly save selection (call before dialog opens to preserve cursor position)
  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current) {
      const range = selection.getRangeAt(0);
      if (editorRef.current.contains(range.startContainer)) {
        savedSelectionRef.current = {
          node: range.startContainer,
          offset: range.startOffset,
        };
      }
    }
  }, []);

  // Escape HTML for safe insertion
  const escapeHtml = useCallback((text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }, []);

  // Insert a button chip at current cursor position
  const insertButton = useCallback(
    (linkType: string, buttonText: string, customUrl?: string) => {
      if (!editorRef.current) return;

      // Build the marker string
      const marker =
        linkType === "CUSTOM" && customUrl
          ? `[[BUTTON:CUSTOM:${buttonText}:${customUrl}]]`
          : `[[BUTTON:${linkType}:${buttonText}]]`;

      // Create chip HTML with escaped buttonText to prevent XSS
      const escapedButtonText = escapeHtml(buttonText);
      const chipHtml = `<span contenteditable="false" class="button-chip" data-button-marker="${encodeURIComponent(marker)}" data-link-type="${linkType}" data-button-text="${encodeURIComponent(buttonText)}" data-custom-url="${encodeURIComponent(customUrl || "")}"><span class="chip-content">${escapedButtonText}</span><span class="chip-delete" data-action="delete">×</span></span>`;

      editorRef.current.focus();

      // Restore saved selection if available (for inserting at cursor position after dialog closes)
      if (savedSelectionRef.current) {
        try {
          const selection = window.getSelection();
          const range = document.createRange();
          range.setStart(
            savedSelectionRef.current.node,
            savedSelectionRef.current.offset,
          );
          range.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(range);
          savedSelectionRef.current = null; // Clear after use
        } catch (e) {
          // Node may no longer exist (e.g., content changed), continue with fallback
        }
      }

      const selection = window.getSelection();

      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        // Check if selection is inside the editor
        if (!editorRef.current.contains(range.startContainer)) {
          // Append with line break for WYSIWYG consistency (buttons render on own line)
          editorRef.current.innerHTML += "<br>" + chipHtml;
        } else {
          range.deleteContents();

          // Insert line break first to put button on its own line (matches email preview)
          const br = document.createElement("br");
          range.insertNode(br);
          range.setStartAfter(br);
          range.setEndAfter(br);

          // Insert chip
          const temp = document.createElement("div");
          temp.innerHTML = chipHtml;
          const chip = temp.firstChild as Node;
          range.insertNode(chip);

          // Move cursor after chip
          range.setStartAfter(chip);
          range.setEndAfter(chip);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else {
        // Fallback: append to end with line break
        editorRef.current.innerHTML += "<br>" + chipHtml;
      }

      handleInput();
    },
    [handleInput, escapeHtml],
  );

  // Insert plain text at current cursor position (for variable insertion)
  const insertText = useCallback(
    (text: string) => {
      if (!editorRef.current) return;

      editorRef.current.focus();

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();

        const textNode = document.createTextNode(text);
        range.insertNode(textNode);

        // Move cursor after inserted text
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // Fallback: append to end
        editorRef.current.appendChild(document.createTextNode(text));
      }

      handleInput();
    },
    [handleInput],
  );

  // Update an existing button chip in place
  const updateButton = useCallback(
    (
      oldMarker: string,
      newLinkType: string,
      newText: string,
      newCustomUrl?: string,
    ) => {
      if (!editorRef.current) return;

      // Find the chip with the matching marker
      const encodedOldMarker = encodeURIComponent(oldMarker);
      const chip = editorRef.current.querySelector(
        `[data-button-marker="${CSS.escape(encodedOldMarker)}"]`,
      ) as HTMLElement;
      if (!chip) return;

      // Build new marker
      const newMarker =
        newLinkType === "CUSTOM" && newCustomUrl
          ? `[[BUTTON:CUSTOM:${newText}:${newCustomUrl}]]`
          : `[[BUTTON:${newLinkType}:${newText}]]`;

      // Update attributes
      chip.setAttribute("data-button-marker", encodeURIComponent(newMarker));
      chip.setAttribute("data-link-type", newLinkType);
      chip.setAttribute("data-button-text", encodeURIComponent(newText));
      chip.setAttribute(
        "data-custom-url",
        encodeURIComponent(newCustomUrl || ""),
      );

      // Update displayed text
      const contentSpan = chip.querySelector(".chip-content");
      if (contentSpan) {
        contentSpan.textContent = newText;
      }

      handleInput();
    },
    [handleInput],
  );

  // Expose insertButton, insertText, updateButton, and saveSelection methods via ref callback
  useEffect(() => {
    // Attach methods to the editor element for parent access
    if (editorRef.current) {
      (editorRef.current as any).insertButton = insertButton;
      (editorRef.current as any).insertText = insertText;
      (editorRef.current as any).updateButton = updateButton;
      (editorRef.current as any).saveSelection = saveSelection;
    }
  }, [insertButton, insertText, updateButton, saveSelection]);

  // Handle paste - strip formatting
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  // Show placeholder when empty and not focused
  const showPlaceholder = !value && !isFocused;

  return (
    <div className={`relative ${className}`}>
      <div
        ref={editorRef}
        contentEditable={true}
        className="
          w-full rounded-md border border-input bg-background px-3 py-2
          text-sm ring-offset-background
          focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          overflow-auto whitespace-pre-wrap
          rich-text-editor
        "
        style={{
          minHeight,
          maxHeight,
          overflowY: maxHeight ? "auto" : undefined,
        }}
        onInput={handleInput}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onPaste={handlePaste}
        data-testid="button-rich-text-editor"
        suppressContentEditableWarning
      />

      {/* Placeholder - positioned behind editor with lower z-index */}
      {showPlaceholder && (
        <div
          className="absolute top-0 left-0 right-0 px-3 py-2 text-sm text-muted-foreground pointer-events-none select-none"
          style={{ zIndex: 0 }}
          aria-hidden="true"
        >
          {placeholder}
        </div>
      )}

      {/* Styles for chips */}
      <style>{`
        .button-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          margin: 0 2px;
          vertical-align: baseline;
          user-select: none;
          cursor: pointer;
          transition: filter 0.15s ease, box-shadow 0.15s ease;
        }

        .button-chip:hover {
          filter: brightness(1.1);
          box-shadow: 0 2px 8px rgba(147, 51, 234, 0.3);
        }
        
        .button-chip .chip-content {
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .button-chip .chip-delete {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          cursor: pointer;
          font-size: 12px;
          line-height: 1;
          transition: background 0.15s ease;
        }
        
        .button-chip .chip-delete:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        
        .rich-text-editor {
          position: relative;
          z-index: 1;
          cursor: text;
          min-height: inherit;
          background: transparent;
        }
      `}</style>
    </div>
  );
}

// Export the type for external usage
export type ButtonRichTextEditorRef = {
  insertButton: (
    linkType: string,
    buttonText: string,
    customUrl?: string,
  ) => void;
  insertText: (text: string) => void;
  updateButton: (
    oldMarker: string,
    newLinkType: string,
    newText: string,
    newCustomUrl?: string,
  ) => void;
  saveSelection: () => void;
};
