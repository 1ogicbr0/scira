import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Code, User, Calendar, MessageSquare, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StackOverflowResult {
  rank: number;
  title: string;
  url: string;
  questionId: string | null;
  type: 'question' | 'answer';
  tags: string[];
  preview: string;
  content: string;
  codeBlocksCount: number;
  publishedDate: string | null;
  author: string;
}

interface StackOverflowResultsProps {
  results: StackOverflowResult[];
  questionGroups: Record<string, { question: any; answers: any[] }>;
  searchQuery: string;
  totalResults: number;
  language?: string;
  tags?: string[];
}

export function StackOverflowResults({
  results,
  questionGroups,
  searchQuery,
  totalResults,
  language,
  tags,
}: StackOverflowResultsProps) {
  if (!results || results.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No Stack Overflow results found for "{searchQuery}"
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center overflow-hidden">
            <img
              src="https://www.google.com/s2/favicons?sz=128&domain=stackoverflow.com"
              alt="Stack Overflow"
              className="w-4 h-4 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <Code className="w-3 h-3 text-white hidden" />
          </div>
          <h3 className="font-semibold text-lg">Stack Overflow Results</h3>
          <Badge variant="secondary">{totalResults} results</Badge>
        </div>
        {language && (
          <Badge variant="outline" className="capitalize">
            {language}
          </Badge>
        )}
      </div>

      {/* Tags if any */}
      {tags && tags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              [{tag}]
            </Badge>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {Object.entries(questionGroups).map(([questionId, group]) => (
          <Card key={questionId} className="border-l-4 border-l-orange-500">
            {/* Question */}
            {group.question && (
              <CardHeader className="pb-3">
                <CardTitle className="text-base leading-relaxed flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 mt-1 text-orange-500 flex-shrink-0" />
                  <div className="flex-1">
                    <a
                      href={group.question.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-orange-600 transition-colors flex items-start gap-2"
                    >
                      <span className="line-clamp-2">{group.question.title}</span>
                      <ExternalLink className="w-3 h-3 mt-1 flex-shrink-0" />
                    </a>
                  </div>
                </CardTitle>
                
                {/* Question metadata */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {group.question.author && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {group.question.author}
                    </div>
                  )}
                  {group.question.publishedDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(group.question.publishedDate).toLocaleDateString()}
                    </div>
                  )}
                  {group.question.codeBlocksCount > 0 && (
                    <div className="flex items-center gap-1">
                      <Code className="w-3 h-3" />
                      {group.question.codeBlocksCount} code {group.question.codeBlocksCount === 1 ? 'block' : 'blocks'}
                    </div>
                  )}
                </div>

                {/* Question tags */}
                {group.question.tags && group.question.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {group.question.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
            )}

            <CardContent className="space-y-3">
              {/* Question preview */}
              {group.question && (
                <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                  <p className="line-clamp-3">{group.question.preview}</p>
                </div>
              )}

              {/* Answers */}
              {group.answers && group.answers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                    <Check className="w-4 h-4" />
                    {group.answers.length} {group.answers.length === 1 ? 'Answer' : 'Answers'}
                  </div>
                  
                  {group.answers.slice(0, 2).map((answer: any, index: number) => (
                    <div key={index} className="border-l-2 border-green-200 pl-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <a
                          href={answer.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:text-green-600 transition-colors flex items-center gap-1"
                        >
                          Answer {index + 1}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {answer.author && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {answer.author}
                            </div>
                          )}
                          {answer.codeBlocksCount > 0 && (
                            <div className="flex items-center gap-1">
                              <Code className="w-3 h-3" />
                              {answer.codeBlocksCount}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {answer.preview}
                      </p>
                    </div>
                  ))}
                  
                  {group.answers.length > 2 && (
                    <p className="text-xs text-muted-foreground text-center">
                      + {group.answers.length - 2} more answers
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Individual results not grouped by questions */}
        {results
          .filter(result => !Object.values(questionGroups).some(group => 
            group.question?.questionId === result.questionId || 
            group.answers.some((answer: any) => answer.questionId === result.questionId)
          ))
          .map((result) => (
            <Card key={result.rank} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-base leading-relaxed">
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 transition-colors flex items-start gap-2"
                  >
                    <span className="line-clamp-2">{result.title}</span>
                    <ExternalLink className="w-3 h-3 mt-1 flex-shrink-0" />
                  </a>
                </CardTitle>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs capitalize">
                    {result.type}
                  </Badge>
                  {result.author && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {result.author}
                    </div>
                  )}
                  {result.codeBlocksCount > 0 && (
                    <div className="flex items-center gap-1">
                      <Code className="w-3 h-3" />
                      {result.codeBlocksCount} code {result.codeBlocksCount === 1 ? 'block' : 'blocks'}
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {result.preview}
                </p>
                
                {result.tags && result.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {result.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Footer */}
      <div className="text-center pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          Results from Stack Overflow • {totalResults} total results for "{searchQuery}"
        </p>
      </div>
    </div>
  );
} 