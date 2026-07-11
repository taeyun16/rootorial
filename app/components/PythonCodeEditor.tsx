"use client";

import { indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { classHighlighter } from "@lezer/highlight";
import { basicSetup } from "codemirror";
import { useEffect, useRef } from "react";

type PythonCodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
};

const editorTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      minHeight: "390px",
      backgroundColor: "#171d1a",
      color: "#dfe9e3",
      fontSize: "12px",
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: "var(--mono)",
      lineHeight: "1.8",
    },
    ".cm-content": {
      padding: "18px 0",
      caretColor: "#f1cf62",
    },
    ".cm-line": {
      padding: "0 22px 0 12px",
    },
    ".cm-gutters": {
      border: "0",
      backgroundColor: "#141a17",
      color: "#5f6d65",
      paddingLeft: "6px",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(216, 242, 229, 0.045)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(216, 242, 229, 0.06)",
      color: "#a6b7ad",
    },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(91, 91, 214, 0.34) !important",
    },
    "&.cm-focused": {
      outline: "3px solid rgba(117, 200, 166, 0.26)",
      outlineOffset: "-3px",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "#f1cf62",
    },
    ".cm-matchingBracket": {
      backgroundColor: "rgba(241, 207, 98, 0.18)",
      outline: "1px solid rgba(241, 207, 98, 0.5)",
    },
    ".cm-tooltip": {
      border: "1px solid #38433e",
      backgroundColor: "#1c2420",
      color: "#dfe9e3",
    },
    ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
      backgroundColor: "#28463d",
      color: "#ffffff",
    },
  },
  { dark: true },
);

export function PythonCodeEditor({
  value,
  onChange,
  ariaLabel,
}: PythonCodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!hostRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        python(),
        syntaxHighlighting(classHighlighter),
        keymap.of([indentWithTab]),
        EditorView.lineWrapping,
        editorTheme,
        EditorView.contentAttributes.of({
          "aria-label": ariaLabel,
          "aria-multiline": "true",
          spellcheck: "false",
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // The editor is created once; value changes are synchronized below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ariaLabel]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentValue = view.state.doc.toString();
    if (currentValue === value) return;

    view.dispatch({
      changes: { from: 0, to: currentValue.length, insert: value },
    });
  }, [value]);

  return <div className="code-editor" ref={hostRef} />;
}
