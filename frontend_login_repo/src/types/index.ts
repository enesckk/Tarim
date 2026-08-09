export interface Chapter {
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  subtitle?: string;
  description?: string;
  iconName: string;
}

export interface ApplicationFormData {
  fullName: string;
  tcNo: string;
  phone: string;
  district: string;
  neighborhood: string;
  adaNo: string;
  parselNo: string;
  landArea: string;
  cropType: string;
}
