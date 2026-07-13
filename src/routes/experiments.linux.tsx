import { createFileRoute } from "@tanstack/react-router";
import { LinuxBrowserLab } from "../components/linux/LinuxBrowserLab";
import { PageMetadataSync } from "../components/PageMetadataSync";

const linuxExperimentMetadata = {
  ko: {
    title: "브라우저 Linux 실험 · Rootorial",
    description:
      "WebAssembly로 실제 Linux 커널을 부팅하고, 교육용 가상 파일시스템과 셸 명령을 실습합니다.",
  },
  en: {
    title: "Linux in the Browser Experiment · Rootorial",
    description:
      "Boot a real Linux kernel with WebAssembly and practice shell commands in a clearly labeled teaching filesystem.",
  },
} as const;

export const Route = createFileRoute("/experiments/linux")({
  head: ({ match }) => {
    const locale =
      (match.search as { lang?: unknown }).lang === "en" ? "en" : "ko";
    return {
      meta: [
        {
          title: linuxExperimentMetadata[locale].title,
        },
        {
          name: "description",
          content: linuxExperimentMetadata[locale].description,
        },
      ],
    };
  },
  component: LinuxExperimentRoute,
});

function LinuxExperimentRoute() {
  return (
    <>
      <PageMetadataSync metadata={linuxExperimentMetadata} />
      <LinuxBrowserLab />
    </>
  );
}
