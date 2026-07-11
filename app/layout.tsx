import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://rezero.study"),
  title: {
    default: "Re:Zero — Transformer를 바닥부터",
    template: "%s · Re:Zero",
  },
  description:
    "수학적 직관, 실행 가능한 코드, 인터랙티브 시각화로 Transformer를 바닥부터 이해하는 한국어 교과서.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
