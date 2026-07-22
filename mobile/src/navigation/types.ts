export type RootStackParamList = {
  Login: undefined;
  MainTabs: { screen?: keyof MainTabParamList } | undefined;
  TaskDetail: { taskId: string };
  CapturePhoto: { taskId: string; notes?: string };
  CompleteTask: { taskId: string; photoAttached?: boolean; notes?: string };
  AskExpert: { taskId?: string; landId?: string };
  ReportProblem: { taskId?: string; taskTitle?: string; landId?: string };
  ChatThread: { conversationId: string };
  ProducerSearch: undefined;
};

export type MainTabParamList = {
  Today: undefined;
  Messages: undefined;
  Notifications: undefined;
  Profile: undefined;
};
