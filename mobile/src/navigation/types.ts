export type RootStackParamList = {
  Giris: undefined;
  AnaSekmeler: { screen?: keyof MainTabParamList } | undefined;
  GorevDetay: { taskId: string };
  FotografCek: {
    taskId: string;
    notes?: string;
    evidence?: import('../utils/taskThemes').TaskEvidence;
  };
  OnayaGonder: {
    taskId: string;
    photoAttached?: boolean;
    notes?: string;
    evidence?: import('../utils/taskThemes').TaskEvidence;
  };
  UzmanaSor: { taskId?: string; taskTitle?: string; landId?: string };
  SorunBildir: { taskId?: string; taskTitle?: string; landId?: string };
  SohbetKonu: { conversationId: string };
  UreticiAra: undefined;
};

export type MainTabParamList = {
  Gorevler: undefined;
  Sohbet: undefined;
  Bildirimler: undefined;
  Profil: undefined;
};
