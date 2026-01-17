import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { Placeholder } from '@tiptap/extension-placeholder';
import { FontFamily } from '@tiptap/extension-font-family';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Undo,
  Redo,
  ChevronDown,
  Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
        },
    };
  },
});

const FONT_SIZES = ['12', '14', '16', '18', '20', '24', '28', '32', '36', '48'];

const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Sans Serif', value: 'Inter, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Monospace', value: 'monospace' },
  { label: 'Cursive', value: 'cursive' },
];

const TEXT_COLORS = [
  '#000000', '#374151', '#6B7280', '#9CA3AF',
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6',
];

export interface ContractRichTextEditorRef {
  insertVariable: (variable: string) => void;
  getEditor: () => Editor | null;
}

interface ContractRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}

export const ContractRichTextEditor = forwardRef<ContractRichTextEditorRef, ContractRichTextEditorProps>(
  function ContractRichTextEditor({
    value,
    onChange,
    onBlur,
    placeholder = 'Enter your contract template here...',
    className,
  }, ref) {
    const [currentFontSize, setCurrentFontSize] = useState('16');

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
        }),
        TextStyle,
        Color,
        Underline,
        FontFamily,
        FontSize,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Placeholder.configure({
          placeholder,
        }),
      ],
      content: value || '',
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
        const attrs = editor.getAttributes('textStyle');
        if (attrs.fontSize) {
          setCurrentFontSize(attrs.fontSize.replace('px', ''));
        }
      },
      onSelectionUpdate: ({ editor }) => {
        const attrs = editor.getAttributes('textStyle');
        if (attrs.fontSize) {
          setCurrentFontSize(attrs.fontSize.replace('px', ''));
        } else {
          setCurrentFontSize('16');
        }
      },
      onBlur: () => {
        onBlur?.();
      },
      editorProps: {
        attributes: {
          class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3',
        },
      },
    });

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      insertVariable: (variable: string) => {
        if (editor) {
          editor.chain().focus().insertContent(variable).run();
        }
      },
      getEditor: () => editor,
    }), [editor]);

    useEffect(() => {
      if (editor && value !== editor.getHTML()) {
        editor.commands.setContent(value || '');
      }
    }, [value, editor]);

    const getCurrentHeadingLevel = useCallback(() => {
      if (!editor) return 'Paragraph';
      if (editor.isActive('heading', { level: 1 })) return 'Heading 1';
      if (editor.isActive('heading', { level: 2 })) return 'Heading 2';
      if (editor.isActive('heading', { level: 3 })) return 'Heading 3';
      return 'Paragraph';
    }, [editor]);

    const getCurrentFontFamily = useCallback(() => {
      if (!editor) return 'Default';
      const attrs = editor.getAttributes('textStyle');
      const family = attrs.fontFamily || '';
      const found = FONT_FAMILIES.find(f => f.value === family);
      return found?.label || 'Default';
    }, [editor]);

    if (!editor) {
      return null;
    }

    return (
      <div className={cn('border rounded-lg bg-white overflow-hidden', className)}>
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-gray-50 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs font-medium gap-1 min-w-[90px] justify-between bg-primary/10 hover:bg-primary/20"
              >
                {getCurrentHeadingLevel()}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
                Paragraph
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                <span className="text-2xl font-bold">Heading 1</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                <span className="text-xl font-bold">Heading 2</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                <span className="text-lg font-bold">Heading 3</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs font-medium gap-1 min-w-[80px] justify-between"
              >
                {getCurrentFontFamily()}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {FONT_FAMILIES.map((font) => (
                <DropdownMenuItem
                  key={font.label}
                  onClick={() => {
                    if (font.value) {
                      editor.chain().focus().setFontFamily(font.value).run();
                    } else {
                      editor.chain().focus().unsetFontFamily().run();
                    }
                  }}
                  style={{ fontFamily: font.value || 'inherit' }}
                >
                  {font.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs font-medium gap-1 min-w-[50px] justify-between"
              >
                {currentFontSize}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-[200px] overflow-y-auto">
              {FONT_SIZES.map((size) => (
                <DropdownMenuItem
                  key={size}
                  onClick={() => {
                    editor.chain().focus().setFontSize(`${size}px`).run();
                    setCurrentFontSize(size);
                  }}
                  className={cn(currentFontSize === size && 'bg-muted')}
                >
                  {size}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-5 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', editor.isActive('bold') && 'bg-muted')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', editor.isActive('italic') && 'bg-muted')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', editor.isActive('underline') && 'bg-muted')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="w-4 h-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold">A</span>
                  <div
                    className="w-4 h-1 rounded-sm -mt-0.5"
                    style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }}
                  />
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="grid grid-cols-6 gap-1">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => editor.chain().focus().setColor(color).run()}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="w-px h-5 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', editor.isActive({ textAlign: 'left' }) && 'bg-muted')}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <AlignLeft className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', editor.isActive({ textAlign: 'center' }) && 'bg-muted')}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <AlignCenter className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', editor.isActive({ textAlign: 'right' }) && 'bg-muted')}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            <AlignRight className="w-4 h-4" />
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', editor.isActive('bulletList') && 'bg-muted')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', editor.isActive('orderedList') && 'bg-muted')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="w-4 h-4" />
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <Minus className="w-4 h-4" />
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="w-4 h-4" />
          </Button>
        </div>

        <EditorContent editor={editor} className="min-h-[300px]" />
      </div>
    );
  }
);
