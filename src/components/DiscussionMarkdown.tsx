import highlightJs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

highlightJs.registerLanguage("bash", bash);
highlightJs.registerLanguage("sh", bash);
highlightJs.registerLanguage("shell", bash);
highlightJs.registerLanguage("zsh", bash);
highlightJs.registerLanguage("c", c);
highlightJs.registerLanguage("cpp", cpp);
highlightJs.registerLanguage("c++", cpp);
highlightJs.registerLanguage("css", css);
highlightJs.registerLanguage("go", go);
highlightJs.registerLanguage("java", java);
highlightJs.registerLanguage("javascript", javascript);
highlightJs.registerLanguage("js", javascript);
highlightJs.registerLanguage("jsx", javascript);
highlightJs.registerLanguage("json", json);
highlightJs.registerLanguage("python", python);
highlightJs.registerLanguage("py", python);
highlightJs.registerLanguage("rust", rust);
highlightJs.registerLanguage("rs", rust);
highlightJs.registerLanguage("sql", sql);
highlightJs.registerLanguage("typescript", typescript);
highlightJs.registerLanguage("ts", typescript);
highlightJs.registerLanguage("tsx", typescript);
highlightJs.registerLanguage("html", xml);
highlightJs.registerLanguage("xml", xml);
highlightJs.registerLanguage("yaml", yaml);
highlightJs.registerLanguage("yml", yaml);

export function DiscussionMarkdown({ source }: { source: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const language = /language-([^\s]+)/.exec(className ?? "")?.[1];
          if (language && highlightJs.getLanguage(language)) {
            const highlighted = highlightJs.highlight(
              String(children).replace(/\n$/, ""),
              { language },
            ).value;
            return (
              <code
                {...props}
                className={`${className ?? ""} hljs`.trim()}
                dangerouslySetInnerHTML={{ __html: highlighted }}
              />
            );
          }
          return <code {...props} className={className}>{children}</code>;
        },
      }}
    >
      {source}
    </Markdown>
  );
}
