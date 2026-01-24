import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ContentBlock } from "@/lib/blocks-to-text";
import { useQuery } from "@tanstack/react-query";
import {
  generateEmailHeader,
  generateEmailSignature,
  type BrandingData,
} from "@shared/email-branding-shared";

// Button marker format: [[BUTTON:LINKTYPE:ButtonText]] or [[BUTTON:CUSTOM:ButtonText:url]]
const BUTTON_MARKER_REGEX = /\[\[BUTTON:([A-Z_]+):([^\]]+?)(?::([^\]]+))?\]\]/g;

interface EmailPreviewProps {
  subject?: string;
  templateBody?: string;
  blocks?: ContentBlock[];
  className?: string;
  includeHeroImage?: boolean;
  heroImageUrl?: string;
  includeHeader?: boolean;
  headerStyle?: string;
  includeSignature?: boolean;
  signatureStyle?: string;
  hideCardWrapper?: boolean;
}

export function EmailPreview({
  subject,
  templateBody,
  blocks = [],
  className,
  includeHeroImage,
  heroImageUrl,
  includeHeader,
  headerStyle,
  includeSignature,
  signatureStyle,
  hideCardWrapper = false,
}: EmailPreviewProps) {
  const { data: photographer } = useQuery({
    queryKey: ["/api/photographers/me"],
  });

  const brandingData: BrandingData = {
    businessName: photographer?.businessName,
    photographerName: photographer?.photographerName,
    logoUrl: photographer?.logoUrl,
    headshotUrl: photographer?.headshotUrl,
    brandPrimary: photographer?.brandPrimary,
    brandSecondary: photographer?.brandSecondary,
    phone: photographer?.phone,
    email: photographer?.email,
    website: photographer?.website,
    businessAddress: photographer?.businessAddress,
    socialLinks: photographer?.socialLinks,
  };

  // Render content from templateBody string format
  const renderFromTemplateBody = (body: string) => {
    if (!body || !body.trim()) {
      return (
        <div className="text-center text-muted-foreground py-12">
          <p>No content to preview</p>
          <p className="text-sm mt-2">Add content to see it here</p>
        </div>
      );
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;
    const regex = new RegExp(BUTTON_MARKER_REGEX.source, "g");

    while ((match = regex.exec(body)) !== null) {
      // Add text before this button marker
      if (match.index > lastIndex) {
        const textContent = body.substring(lastIndex, match.index).trim();
        if (textContent) {
          // Split by double newlines for paragraphs
          const paragraphs = textContent.split(/\n\n+/).filter(Boolean);
          paragraphs.forEach((para) => {
            elements.push(
              <p key={key++} className="text-gray-700 mb-4 whitespace-pre-wrap">
                {para}
              </p>,
            );
          });
        }
      }

      // Add the button
      const linkType = match[1];
      const buttonText = match[2];
      const customUrl = match[3] || "";

      let linkPreview = "#";
      if (linkType === "SMART_FILE") {
        linkPreview = "{{smart_file_link}}";
      } else if (linkType === "GALLERY") {
        linkPreview = "{{gallery_link}}";
      } else if (linkType === "CALENDAR") {
        linkPreview = "{{calendar_link}}";
      } else if (linkType === "CUSTOM" && customUrl) {
        linkPreview = customUrl;
      }

      elements.push(
        <div key={key++} className="mb-4">
          <a
            href={linkPreview}
            className="inline-block px-6 py-3 rounded-md font-semibold text-center no-underline bg-blue-600 text-white hover:bg-blue-700"
          >
            {buttonText}
          </a>
        </div>,
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last button
    if (lastIndex < body.length) {
      const textContent = body.substring(lastIndex).trim();
      if (textContent) {
        const paragraphs = textContent.split(/\n\n+/).filter(Boolean);
        paragraphs.forEach((para) => {
          elements.push(
            <p key={key++} className="text-gray-700 mb-4 whitespace-pre-wrap">
              {para}
            </p>,
          );
        });
      }
    }

    return elements.length > 0 ? (
      elements
    ) : (
      <div className="text-center text-muted-foreground py-12">
        <p>No content to preview</p>
        <p className="text-sm mt-2">Add content to see it here</p>
      </div>
    );
  };

  const renderBlock = (block: ContentBlock) => {
    switch (block.type) {
      case "HEADER":
        return brandingData ? (
          <div
            dangerouslySetInnerHTML={{
              __html: generateEmailHeader(
                block.content?.style || "professional",
                brandingData,
              ),
            }}
          />
        ) : null;

      case "SIGNATURE":
        return brandingData ? (
          <div
            dangerouslySetInnerHTML={{
              __html: generateEmailSignature(
                block.content?.style || "professional",
                brandingData,
              ),
            }}
          />
        ) : null;

      case "HEADING":
        return (
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {block.content?.text || "Heading"}
          </h2>
        );

      case "TEXT":
        return (
          <p className="text-gray-700 mb-4 whitespace-pre-wrap">
            {block.content?.text || "Text content"}
          </p>
        );

      case "BUTTON":
        const variant = block.content?.variant || "default";
        const buttonClasses = cn(
          "inline-block px-6 py-3 rounded-md font-semibold text-center no-underline",
          {
            "bg-blue-600 text-white hover:bg-blue-700": variant === "default",
            "bg-gray-600 text-white hover:bg-gray-700": variant === "secondary",
            "bg-transparent text-blue-600 border-2 border-blue-600 hover:bg-blue-50":
              variant === "outline",
          },
        );

        let linkPreview = block.content?.linkValue || "#";
        if (block.content?.linkType === "SMART_FILE") {
          linkPreview = "{{smart_file_link}}";
        } else if (block.content?.linkType === "GALLERY") {
          linkPreview = "{{gallery_link}}";
        } else if (block.content?.linkType === "CALENDAR") {
          linkPreview = "{{calendar_link}}";
        }

        return (
          <div className="mb-4">
            <a href={linkPreview} className={buttonClasses}>
              {block.content?.text || "Button Text"}
            </a>
          </div>
        );

      case "IMAGE":
        return block.content?.url ? (
          <div className="mb-4">
            <img
              src={block.content.url}
              alt="Email content"
              className="max-w-full h-auto rounded"
            />
          </div>
        ) : (
          <div className="mb-4 p-8 bg-gray-100 rounded text-center text-gray-400">
            No image URL provided
          </div>
        );

      case "SPACER":
        return (
          <div
            style={{ height: `${block.content?.height || 20}px` }}
            className="mb-4"
          />
        );

      default:
        return null;
    }
  };

  // Check if using templateBody (new format) or blocks (legacy format)
  const useTemplateBody = templateBody !== undefined;

  // Legacy blocks handling (only used if templateBody not provided)
  const hasHeaderBlock = blocks.some((b) => b.type === "HEADER");
  const hasSignatureBlock = blocks.some((b) => b.type === "SIGNATURE");
  const contentBlocks = blocks.filter(
    (b) => b.type !== "HEADER" && b.type !== "SIGNATURE",
  );
  const headerBlocks = blocks.filter((b) => b.type === "HEADER");
  const signatureBlocks = blocks.filter((b) => b.type === "SIGNATURE");

  const emailContent = (
    <div
      className="bg-white rounded-lg border max-w-2xl mx-auto overflow-hidden"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      {/* Hero Image */}
      {includeHeroImage && heroImageUrl && (
        <div className="w-full">
          <img src={heroImageUrl} alt="Hero" className="w-full h-auto" />
        </div>
      )}

      {/* Header - using flags for templateBody mode, blocks for legacy */}
      {useTemplateBody ? (
        includeHeader &&
        headerStyle && (
          <div
            dangerouslySetInnerHTML={{
              __html: generateEmailHeader(headerStyle, brandingData),
            }}
          />
        )
      ) : (
        <>
          {headerBlocks.map((block) => (
            <div key={block.id}>{renderBlock(block)}</div>
          ))}
          {!hasHeaderBlock && includeHeader && headerStyle && (
            <div
              dangerouslySetInnerHTML={{
                __html: generateEmailHeader(headerStyle, brandingData),
              }}
            />
          )}
        </>
      )}

      {/* Content - render from templateBody or blocks */}
      <div className="p-8">
        {useTemplateBody ? (
          renderFromTemplateBody(templateBody)
        ) : blocks.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <p>No content to preview</p>
            <p className="text-sm mt-2">Add content to see it here</p>
          </div>
        ) : contentBlocks.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <p>Add content to see it here</p>
          </div>
        ) : (
          contentBlocks.map((block) => (
            <div key={block.id}>{renderBlock(block)}</div>
          ))
        )}
      </div>

      {/* Signature - using flags for templateBody mode, blocks for legacy */}
      {useTemplateBody ? (
        includeSignature &&
        signatureStyle && (
          <div
            dangerouslySetInnerHTML={{
              __html: generateEmailSignature(signatureStyle, brandingData),
            }}
          />
        )
      ) : (
        <>
          {signatureBlocks.map((block) => (
            <div key={block.id}>{renderBlock(block)}</div>
          ))}
          {!hasSignatureBlock && includeSignature && signatureStyle && (
            <div
              dangerouslySetInnerHTML={{
                __html: generateEmailSignature(signatureStyle, brandingData),
              }}
            />
          )}
        </>
      )}
    </div>
  );

  if (hideCardWrapper) {
    return emailContent;
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-muted/50 border-b">
        <CardTitle className="text-base">Email Preview</CardTitle>
        {subject && (
          <div className="text-sm text-muted-foreground mt-2">
            <span className="font-semibold">Subject:</span> {subject}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6">{emailContent}</CardContent>
    </Card>
  );
}
