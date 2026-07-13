import { createFileRoute } from "@tanstack/react-router";
import { LinuxBrowserLab } from "../components/linux/LinuxBrowserLab";

export const Route = createFileRoute("/experiments/linux")({
  head: ({ match }) => {
    const isEnglish = (match.search as { lang?: unknown }).lang === "en";
    return {
      meta: [
        {
          title: isEnglish
            ? "Linux in the Browser Experiment · Rootorial"
            : "브라우저 Linux 실험 · Rootorial",
        },
        {
          name: "description",
          content: isEnglish
            ? "Boot a real Linux kernel with WebAssembly and practice shell commands in a clearly labeled teaching filesystem."
            : "WebAssembly로 실제 Linux 커널을 부팅하고, 교육용 가상 파일시스템과 셸 명령을 실습합니다.",
        },
      ],
    };
  },
  component: LinuxBrowserLab,
});
