import { Model, Types } from 'mongoose';

// ── Question Type Enums ──
export type TQuestionType =
  | 'MCQ'
  | 'Swipe'
  | 'Ordering'
  | 'Chat Scenario'
  | 'Video'
  | 'Free Input'
  | 'Rating'
  | 'Information'
  | 'Simulated Call';

export type TModuleStatus = 'draft' | 'published';

// ── Base Question Fields ──
interface IQuestionBase {
  id: string;
  type: TQuestionType;
  content: string;
  image?: string;
  explanation?: string;
  incorrectExplanation?: string;
  isScored: boolean;
  colorCode?: string;
  feedback?: string;
}

// ── Type-Specific Question Variants ──
export interface IMCQQuestion extends IQuestionBase {
  type: 'MCQ';
  options: string[];
  correctAnswer: string;
}

export interface ISwipeQuestion extends IQuestionBase {
  type: 'Swipe';
  leftLabel: string;
  rightLabel: string;
  correctDirection?: 'left' | 'right';
}

export interface IOrderingQuestion extends IQuestionBase {
  type: 'Ordering';
  items: string[];
}

// ── Chat Scenario: Branching Step Option ──
export interface IChatStepOption {
  optionId: string;
  text: string;
  nextStepId?: string | null;  // branching: go to this step if selected, null = end
  feedback?: string;           // feedback message after selecting this option
  isCorrect?: boolean;         // for scored questions
}

// ── Chat Scenario: Conversation Step ──
export interface IChatStep {
  stepId: string;
  messages: {                  // messages shown at this step (chat bubbles)
    sender: string;
    text: string;
    isUser?: boolean;          // true = participant's message, false = other person
  }[];
  options?: IChatStepOption[]; // user's response choices (empty = end of path)
}

export interface IChatScenarioQuestion extends IQuestionBase {
  type: 'Chat Scenario';
  // ── New Branching Chat Fields ──
  senderName?: string;         // name of the other person in the chat
  senderAvatar?: string;       // avatar/photo URL of the other person
  initialStepId?: string;      // which step to start from (default: first step)
  chatSteps?: IChatStep[];     // branching conversation steps
  // ── Legacy Fields (backward compat) ──
  messages?: { sender: string; text: string }[];
  options?: string[];
  correctAnswer?: string;
}

export interface IVideoQuestion extends IQuestionBase {
  type: 'Video';
  videoUrl: string;
}

export interface IRatingQuestion extends IQuestionBase {
  type: 'Rating';
  scale: number;
}

export interface IFreeInputQuestion extends IQuestionBase {
  type: 'Free Input';
}

export interface IInformationQuestion extends IQuestionBase {
  type: 'Information';
}

export interface ISimulatedCallQuestion extends IQuestionBase {
  type: 'Simulated Call';
  callerName: string;
  callerPhoto?: string;
  postCallVideoUrl?: string;
  postCallMessage?: string;
}

// ── Union of all question types ──
export type TQuestion =
  | IMCQQuestion
  | ISwipeQuestion
  | IOrderingQuestion
  | IChatScenarioQuestion
  | IVideoQuestion
  | IRatingQuestion
  | IFreeInputQuestion
  | IInformationQuestion
  | ISimulatedCallQuestion;

// ── Module Document ──
export interface IModule {
  title: string;
  description: string;
  thumbnailImage?: string;
  questions: TQuestion[];
  status: TModuleStatus;
  createdBy: Types.ObjectId;
  topicId?: Types.ObjectId;
  teamId?: Types.ObjectId;
  companyId?: Types.ObjectId;
  isDeleted: boolean;
}

export type TModuleModel = Model<IModule>;
