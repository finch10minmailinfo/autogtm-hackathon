export type OrangeSliceProspect = {
  name: string;
  role: string;
  company: string;
  linkedin_url: string;
  company_context: string;
  intent_signal: string;
  source_url: string;
};

export type OrangeSliceIntentSignal = {
  text: string;
  source_url: string;
  company: string;
};

export type AudienceFinderResult = {
  prospects: OrangeSliceProspect[];
  list_size: number;
  isSample: boolean;
};

export type IntentSignalsResult = {
  signals: OrangeSliceIntentSignal[];
  isSample: boolean;
};
