import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ExternalHyperlink } from 'docx';

interface Source {
  url: string;
  title: string;
  text?: string;
  favicon?: string;
}

interface ResearchData {
  title: string;
  content: string;
  sources: Source[];
  timestamp: Date;
  query?: string;
}

// Clean and format text for export
function cleanText(text: string): string {
  // Remove markdown formatting and clean up text
  return text
    .replace(/#{1,6}\s+/g, '') // Remove markdown headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
    .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
    .replace(/`(.*?)`/g, '$1') // Remove code formatting
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove markdown links, keep text
    .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
    .trim();
}

// Extract text content and remove citations
function extractMainContent(content: string): string {
  // Remove citation patterns like [Source Name](URL)
  const withoutCitations = content.replace(/\[([^\]]+)\]\([^)]+\)/g, '');
  return cleanText(withoutCitations);
}

// Extract citations from content
function extractCitations(content: string): string[] {
  const citationRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const citations: string[] = [];
  let match;
  
  while ((match = citationRegex.exec(content)) !== null) {
    citations.push(`${match[1]} - ${match[2]}`);
  }
  
  return [...new Set(citations)]; // Remove duplicates
}

export async function exportToPDF(data: ResearchData): Promise<void> {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.width;
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Add title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  const titleLines = pdf.splitTextToSize(data.title, maxWidth);
  pdf.text(titleLines, margin, yPosition);
  yPosition += titleLines.length * 10 + 10;

  // Add metadata
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100);
  if (data.query) {
    pdf.text(`Query: ${data.query}`, margin, yPosition);
    yPosition += 10;
  }
  pdf.text(`Generated: ${data.timestamp.toLocaleString()}`, margin, yPosition);
  yPosition += 10;
  pdf.text(`Document generated using www.ola.chat`, margin, yPosition);
  yPosition += 15;

  // Add separator line
  pdf.setDrawColor(200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;

  // Add main content
  pdf.setFontSize(11);
  pdf.setTextColor(0);
  pdf.setFont('helvetica', 'normal');
  
  const mainContent = extractMainContent(data.content);
  const contentLines = pdf.splitTextToSize(mainContent, maxWidth);
  
  for (let i = 0; i < contentLines.length; i++) {
    if (yPosition > pdf.internal.pageSize.height - margin) {
      pdf.addPage();
      yPosition = margin;
    }
    pdf.text(contentLines[i], margin, yPosition);
    yPosition += 7;
  }

  // Add citations section
  const citations = extractCitations(data.content);
  if (citations.length > 0) {
    yPosition += 15;
    
    if (yPosition > pdf.internal.pageSize.height - margin - 40) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Citations', margin, yPosition);
    yPosition += 15;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    citations.forEach((citation) => {
      if (yPosition > pdf.internal.pageSize.height - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      const citationLines = pdf.splitTextToSize(`• ${citation}`, maxWidth);
      pdf.text(citationLines, margin, yPosition);
      yPosition += citationLines.length * 6 + 3;
    });
  }

  // Add sources section
  if (data.sources.length > 0) {
    yPosition += 15;
    
    if (yPosition > pdf.internal.pageSize.height - margin - 40) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Sources', margin, yPosition);
    yPosition += 15;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    data.sources.forEach((source, index) => {
      if (yPosition > pdf.internal.pageSize.height - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      
      const sourceText = `${index + 1}. ${source.title}\n   ${source.url}`;
      const sourceLines = pdf.splitTextToSize(sourceText, maxWidth);
      pdf.text(sourceLines, margin, yPosition);
      yPosition += sourceLines.length * 6 + 8;
    });
  }

  // Save the PDF
  const fileName = `research-report-${data.timestamp.toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
}

export async function exportToWord(data: ResearchData): Promise<void> {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: data.title,
          bold: true,
          size: 32,
        }),
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Metadata
  const metadataText = data.query 
    ? `Query: ${data.query}\nGenerated: ${data.timestamp.toLocaleString()}`
    : `Generated: ${data.timestamp.toLocaleString()}`;

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: metadataText,
          italics: true,
          size: 20,
          color: "666666",
        }),
      ],
      spacing: { after: 400 },
    })
  );

  // Main content
  const mainContent = extractMainContent(data.content);
  const contentParagraphs = mainContent.split('\n\n');
  
  contentParagraphs.forEach((paragraph) => {
    if (paragraph.trim()) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: paragraph.trim(),
              size: 24,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }
  });

  // Citations section
  const citations = extractCitations(data.content);
  if (citations.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Citations",
            bold: true,
            size: 28,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    citations.forEach((citation) => {
      const [title, url] = citation.split(' - ');
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "• ",
              size: 22,
            }),
            new ExternalHyperlink({
              children: [
                new TextRun({
                  text: title,
                  size: 22,
                  color: "0066CC",
                  underline: {},
                }),
              ],
              link: url,
            }),
            new TextRun({
              text: ` (${url})`,
              size: 20,
              color: "666666",
            }),
          ],
          spacing: { after: 100 },
        })
      );
    });
  }

  // Sources section
  if (data.sources.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Sources",
            bold: true,
            size: 28,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    data.sources.forEach((source, index) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. `,
              size: 22,
            }),
            new ExternalHyperlink({
              children: [
                new TextRun({
                  text: source.title,
                  size: 22,
                  color: "0066CC",
                  underline: {},
                }),
              ],
              link: source.url,
            }),
          ],
          spacing: { after: 100 },
        })
      );
      
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `   ${source.url}`,
              size: 20,
              color: "666666",
            }),
          ],
          spacing: { after: 200 },
        })
      );
    });
  }

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  // Generate and save
  const blob = await Packer.toBlob(doc);
  const fileName = `research-report-${data.timestamp.toISOString().split('T')[0]}.docx`;
  saveAs(blob, fileName);
}

// Extract research data from message parts
export function extractResearchData(message: any, userQuery?: string): ResearchData | null {
  if (!message.parts) return null;

  const toolInvocationParts = message.parts.filter((part: any) => part.type === 'tool-invocation');
  const textParts = message.parts.filter((part: any) => part.type === 'text');
  
  if (toolInvocationParts.length === 0) return null;

  // Extract sources from tool invocations
  const allSources: Source[] = [];
  let hasResearchContent = false;

  toolInvocationParts.forEach((part: any) => {
    const toolInvocation = part.toolInvocation;
    if (toolInvocation?.state === 'result' && toolInvocation.result) {
      // Handle extreme search results
      if (toolInvocation.toolName === 'extreme_search' && toolInvocation.result.research?.sources) {
        hasResearchContent = true;
        toolInvocation.result.research.sources.forEach((source: any) => {
          allSources.push({
            url: source.url,
            title: source.title || new URL(source.url).hostname,
            text: source.text || source.content,
            favicon: source.favicon,
          });
        });
      }
      // Handle multi search results
      else if (toolInvocation.toolName === 'multi_search' && toolInvocation.result.searches) {
        hasResearchContent = true;
        toolInvocation.result.searches.forEach((search: any) => {
          search.results?.forEach((result: any) => {
            allSources.push({
              url: result.url,
              title: result.title || new URL(result.url).hostname,
              text: result.content || result.text,
              favicon: result.favicon,
            });
          });
        });
      }
      // Handle web search results
      else if (toolInvocation.toolName === 'web_search' && toolInvocation.result.results) {
        hasResearchContent = true;
        toolInvocation.result.results.forEach((result: any) => {
          if (result.url) {
            allSources.push({
              url: result.url,
              title: result.title || new URL(result.url).hostname,
              text: result.content || result.text,
              favicon: result.favicon,
            });
          }
        });
      }
      // Handle v0 search results
      else if (toolInvocation.toolName === 'v0_search' && toolInvocation.result.results) {
        hasResearchContent = true;
        toolInvocation.result.results.forEach((result: any) => {
          if (result.url) {
            allSources.push({
              url: result.url,
              title: result.title || new URL(result.url).hostname,
              text: result.content || result.text,
              favicon: result.favicon,
            });
          }
        });
      }
      // Handle academic search results
      else if (toolInvocation.toolName === 'academic_search' && toolInvocation.result.papers) {
        hasResearchContent = true;
        toolInvocation.result.papers.forEach((paper: any) => {
          if (paper.url) {
            allSources.push({
              url: paper.url,
              title: paper.title || paper.paper_title || new URL(paper.url).hostname,
              text: paper.abstract || paper.content,
              favicon: paper.favicon,
            });
          }
        });
      }
      // Handle Reddit search results
      else if (toolInvocation.toolName === 'reddit_search' && toolInvocation.result.posts) {
        hasResearchContent = true;
        toolInvocation.result.posts.forEach((post: any) => {
          allSources.push({
            url: post.url,
            title: post.title || new URL(post.url).hostname,
            text: post.content || post.selftext,
            favicon: post.favicon,
          });
        });
      }
      // Handle YouTube search results
      else if (toolInvocation.toolName === 'youtube_search' && toolInvocation.result.videos) {
        hasResearchContent = true;
        toolInvocation.result.videos.forEach((video: any) => {
          allSources.push({
            url: video.url,
            title: video.title || new URL(video.url).hostname,
            text: video.description || video.content,
            favicon: video.favicon,
          });
        });
      }
      // Handle Stack Overflow search results
      else if (toolInvocation.toolName === 'stackoverflow_search' && toolInvocation.result.questions) {
        hasResearchContent = true;
        toolInvocation.result.questions.forEach((question: any) => {
          allSources.push({
            url: question.url,
            title: question.title || new URL(question.url).hostname,
            text: question.content || question.body,
            favicon: question.favicon,
          });
        });
      }
      // Handle X (Twitter) search results
      else if (toolInvocation.toolName === 'x_search' && toolInvocation.result.tweets) {
        hasResearchContent = true;
        toolInvocation.result.tweets.forEach((tweet: any) => {
          allSources.push({
            url: tweet.url,
            title: tweet.text?.slice(0, 100) || new URL(tweet.url).hostname,
            text: tweet.text || tweet.content,
            favicon: tweet.favicon,
          });
        });
      }
      // Handle GitHub search results
      else if (toolInvocation.toolName === 'github_search' && toolInvocation.result.repositories) {
        hasResearchContent = true;
        toolInvocation.result.repositories.forEach((repo: any) => {
          allSources.push({
            url: repo.url,
            title: repo.name || repo.full_name || new URL(repo.url).hostname,
            text: repo.description || repo.content,
            favicon: repo.favicon,
          });
        });
      }
      // Handle NPM search results
      else if (toolInvocation.toolName === 'npm_search' && toolInvocation.result.packages) {
        hasResearchContent = true;
        toolInvocation.result.packages.forEach((pkg: any) => {
          allSources.push({
            url: pkg.url,
            title: pkg.name || new URL(pkg.url).hostname,
            text: pkg.description || pkg.content,
            favicon: pkg.favicon,
          });
        });
      }
      // Handle any other search tool with results array
      else if (toolInvocation.result.results && Array.isArray(toolInvocation.result.results)) {
        hasResearchContent = true;
        toolInvocation.result.results.forEach((result: any) => {
          if (result.url) {
            allSources.push({
              url: result.url,
              title: result.title || result.name || new URL(result.url).hostname,
              text: result.content || result.text || result.description,
              favicon: result.favicon,
            });
          }
        });
      }
    }
  });

  if (!hasResearchContent) return null;

  // Get the text content (AI response)
  const content = textParts.map((part: any) => part.text).join('\n');
  
  // Create title from user query or content
  const title = userQuery || 
               content.split('\n')[0]?.replace(/^#+\s*/, '').slice(0, 100) + '...' ||
               'Research Report';

  // Remove duplicates from sources
  const uniqueSources = Array.from(
    new Map(allSources.map(source => [source.url, source])).values()
  );

  return {
    title,
    content,
    sources: uniqueSources,
    timestamp: new Date(),
    query: userQuery,
  };
} 