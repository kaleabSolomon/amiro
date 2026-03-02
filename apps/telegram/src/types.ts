export type CapturePayload = {
  source: "telegram";
  url: string;
  title: string;
  text: string;
  additionalLinks?: Array<{
    url: string;
    title?: string;
  }>;
  tags: string[];
  capturedAt: string;
};
