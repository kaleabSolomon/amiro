export type CapturePayload = {
  source: "telegram";
  url: string;
  title: string;
  text: string;
  additionalLinks?: Array<{
    url: string;
    title?: string;
    siteName?: string;
    description?: string;
  }>;
  tags: string[];
  capturedAt: string;
};
