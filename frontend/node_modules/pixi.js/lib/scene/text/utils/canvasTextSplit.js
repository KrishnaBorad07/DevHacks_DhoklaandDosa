'use strict';

var Matrix = require('../../../maths/matrix/Matrix.js');
var Container = require('../../container/Container.js');
var FillGradient = require('../../graphics/shared/fill/FillGradient.js');
var CanvasTextGenerator = require('../canvas/CanvasTextGenerator.js');
var CanvasTextMetrics = require('../canvas/CanvasTextMetrics.js');
var Text = require('../Text.js');

"use strict";
function getAlignmentOffset(alignment, lineWidth, largestLine) {
  switch (alignment) {
    case "center":
      return (largestLine - lineWidth) / 2;
    case "right":
      return largestLine - lineWidth;
    case "left":
    default:
      return 0;
  }
}
function isNewlineCharacter(char) {
  return char === "\r" || char === "\n" || char === "\r\n";
}
function groupTextSegments(segments, measuredText, textStyle) {
  const groupedSegments = [];
  let currentLine = measuredText.lines[0];
  let matchedLine = "";
  let chars = [];
  let lineCount = 0;
  textStyle.wordWrap = false;
  segments.forEach((segment) => {
    const isWhitespace = /^\s*$/.test(segment);
    const isNewline = isNewlineCharacter(segment);
    const isSpaceAtStart = matchedLine.length === 0 && isWhitespace;
    if (isWhitespace && !isNewline && isSpaceAtStart) {
      return;
    }
    if (!isNewline) matchedLine += segment;
    const metric = CanvasTextMetrics.CanvasTextMetrics.measureText(segment, textStyle);
    chars.push({ char: segment, metric });
    if (matchedLine.length >= currentLine.length) {
      groupedSegments.push({
        line: matchedLine,
        chars,
        width: chars.reduce((acc, seg) => acc + seg.metric.width, 0)
      });
      chars = [];
      matchedLine = "";
      lineCount++;
      currentLine = measuredText.lines[lineCount];
    }
  });
  return groupedSegments;
}
function canvasTextSplit(options) {
  const { text, style, chars: existingChars } = options;
  const textStyle = style;
  const measuredText = CanvasTextMetrics.CanvasTextMetrics.measureText(text, textStyle);
  const segments = CanvasTextMetrics.CanvasTextMetrics.graphemeSegmenter(text);
  const groupedSegments = groupTextSegments(segments, measuredText, textStyle.clone());
  const alignment = textStyle.align;
  const maxLineWidth = measuredText.lineWidths.reduce((max, line) => Math.max(max, line), 0);
  const isSingleLine = measuredText.lines.length === 1;
  const useWordWrapWidth = !isSingleLine && textStyle.wordWrap;
  const alignWidth = useWordWrapWidth ? textStyle.wordWrapWidth : maxLineWidth;
  const fillGradient = textStyle._fill?.fill;
  const strokeGradient = textStyle._stroke?.fill;
  const hasFillGradient = fillGradient instanceof FillGradient.FillGradient;
  const hasStrokeGradient = strokeGradient instanceof FillGradient.FillGradient;
  const hasGradient = hasFillGradient || hasStrokeGradient;
  const hasLocalGradient = hasFillGradient && fillGradient.textureSpace === "local" || hasStrokeGradient && strokeGradient.textureSpace === "local";
  const fullTextWidth = measuredText.width;
  const fullTextHeight = measuredText.height;
  const baseCharStyle = textStyle.clone();
  baseCharStyle.align = "left";
  let trimOffsetX = 0;
  let trimOffsetY = 0;
  if (baseCharStyle.trim) {
    const { frame, canvasAndContext } = CanvasTextGenerator.CanvasTextGenerator.getCanvasAndContext({
      text,
      style: textStyle,
      resolution: 1
    });
    CanvasTextGenerator.CanvasTextGenerator.returnCanvasAndContext(canvasAndContext);
    trimOffsetX = -frame.x;
    trimOffsetY = -frame.y;
    baseCharStyle.trim = false;
  }
  const chars = [];
  const lineContainers = [];
  const wordContainers = [];
  let yOffset = 0;
  const strokeWidth = textStyle._stroke?.width || 0;
  const dropShadowDistance = textStyle.dropShadow?.distance || 0;
  groupedSegments.forEach((group, lineIndex) => {
    const lineContainer = new Container.Container({ label: `line-${lineIndex}` });
    lineContainer.y = yOffset + trimOffsetY;
    lineContainers.push(lineContainer);
    const lineWidth = measuredText.lineWidths[lineIndex];
    let xOffset = getAlignmentOffset(alignment, lineWidth, alignWidth);
    let currentWordContainer = new Container.Container({ label: "word" });
    currentWordContainer.x = xOffset + trimOffsetX;
    group.chars.forEach((segment, charIndex) => {
      if (segment.metric.width === 0) {
        return;
      }
      if (isNewlineCharacter(segment.char)) {
        xOffset += segment.metric.width - strokeWidth;
        return;
      }
      if (segment.char === " ") {
        if (currentWordContainer.children.length > 0) {
          wordContainers.push(currentWordContainer);
          lineContainer.addChild(currentWordContainer);
        }
        xOffset += segment.metric.width + textStyle.letterSpacing - strokeWidth;
        currentWordContainer = new Container.Container({ label: "word" });
        currentWordContainer.x = xOffset + trimOffsetX;
      } else {
        let charStyle = baseCharStyle;
        if (hasGradient) {
          charStyle = baseCharStyle.clone();
          charStyle._gradientOffset = { x: -xOffset, y: -yOffset };
          if (hasLocalGradient) {
            charStyle._gradientBounds = { width: fullTextWidth, height: fullTextHeight };
          }
        }
        let char;
        if (existingChars.length > 0) {
          char = existingChars.shift();
          char.text = segment.char;
          char.style = charStyle;
          char.setFromMatrix(Matrix.Matrix.IDENTITY);
          char.x = xOffset - currentWordContainer.x + trimOffsetX - dropShadowDistance * charIndex;
        } else {
          char = new Text.Text({
            text: segment.char,
            style: charStyle,
            x: xOffset - currentWordContainer.x + trimOffsetX - dropShadowDistance * charIndex
          });
        }
        chars.push(char);
        currentWordContainer.addChild(char);
        xOffset += segment.metric.width + textStyle.letterSpacing - strokeWidth;
      }
    });
    if (currentWordContainer.children.length > 0) {
      wordContainers.push(currentWordContainer);
      lineContainer.addChild(currentWordContainer);
    }
    yOffset += measuredText.lineHeight;
  });
  return { chars, lines: lineContainers, words: wordContainers };
}

exports.canvasTextSplit = canvasTextSplit;
//# sourceMappingURL=canvasTextSplit.js.map
