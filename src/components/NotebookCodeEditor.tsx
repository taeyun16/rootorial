import { indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { classHighlighter } from "@lezer/highlight";
import { basicSetup } from "codemirror";
import { useEffect, useRef } from "react";

type NotebookCodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  ariaLabel: string;
  minHeight?: number;
};

function createEditorTheme(minHeight: number) {
  return EditorView.theme(
    {
      "&": {
        minHeight: `${minHeight}px`,
        backgroundColor: "#171d1a",
        color: "#dfe9e3",
        fontSize: "12px",
      },
      ".cm-scroller": {
        minHeight: `${minHeight}px`,
        overflow: "auto",
        fontFamily: "var(--mono)",
        lineHeight: "1.75",
      },
      ".cm-content": {
        padding: "14px 0",
        caretColor: "#f1cf62",
      },
      ".cm-line": {
        padding: "0 20px 0 10px",
      },
      ".cm-gutters": {
        border: "0",
        backgroundColor: "#141a17",
        color: "#68756e",
        paddingLeft: "5px",
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
}

export function NotebookCodeEditor({
  value,
  onChange,
  onRun,
  ariaLabel,
  minHeight = 190,
}: NotebookCodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  useEffect(() => {
    if (!hostRef.current) return;

    const runFromKeyboard = () => {
      onRunRef.current();
      return true;
    };
    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        python(),
        syntaxHighlighting(classHighlighter),
        keymap.of([
          { key: "Mod-Enter", run: runFromKeyboard },
          { key: "Shift-Enter", run: runFromKeyboard },
          indentWithTab,
        ]),
        EditorView.lineWrapping,
        createEditorTheme(Math.max(120, minHeight)),
        EditorView.contentAttributes.of({
          "aria-label": ariaLabel,
          "aria-multiline": "true",
          "aria-keyshortcuts": "Control+Enter Meta+Enter Shift+Enter",
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
  }, [ariaLabel, minHeight]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentValue = view.state.doc.toString();
    if (currentValue === value) return;

    view.dispatch({
      changes: { from: 0, to: currentValue.length, insert: value },
    });
  }, [value]);

  return <div className="notebook-code-editor" ref={hostRef} />;
}
