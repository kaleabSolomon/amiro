export type CapturePayload = {
  source: "telegram";
  url: string;
  title: string;
  text: string;
  tags: string[];
  capturedAt: string;
};
