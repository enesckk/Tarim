export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  TaskDetail: { taskId: string };
  CapturePhoto: { taskId: string };
  CompleteTask: { taskId: string; photoAttached?: boolean };
  AskExpert: { taskId?: string };
  ChatThread: { conversationId: string };
};

export type MainTabParamList = {
  Today: undefined;
  Messages: undefined;
  Notifications: undefined;
  Profile: undefined;
};
