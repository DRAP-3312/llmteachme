export interface ConversationMetadata {
  level?: 'beginner' | 'intermediate' | 'advanced';
  topic?: string;
  simulationType?: string;
  userGoals?: string[];
}

export interface MessageAnalysis {
  grammarErrors?: Array<{
    error: string;
    suggestion: string;
    position: number;
  }>;
  vocabularyLevel?: string;
  suggestions?: string[];
  score?: number;
}

export interface ConversationContext {
  userId: string;
  conversationId: string;
  history: Array<{
    role: string;
    content: string;
  }>;
  metadata?: ConversationMetadata;
}
