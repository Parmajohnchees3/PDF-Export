import React, { useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry";

pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.js";

const PDFUploader = () => {
  const fileRef = useRef();
  const canvasRef = useRef();
  const [isDrawing, setIsDrawing] = useState(false);
  const [rectangles, setRectangles] = useState([]);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const onFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        await onFileUpload(data);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const onFileUpload = async (pdfData) => {
    if (pdfData) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
  
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
  
      canvas.height = viewport.height;
      canvas.width = viewport.width;
  
      await page.render({ canvasContext: context, viewport }).promise;
  
      // Draw previous rectangles
      rectangles.forEach((rect) => {
        context.strokeRect(rect.x, rect.y, rect.width, rect.height);
      });
    }
  };

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    setStartPos({ x: offsetX, y: offsetY });
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
  
    const width = Math.abs(offsetX - startPos.x);
    const height = Math.abs(offsetY - startPos.y);
  
    // Clear only the area where the current rectangle is being drawn
    const x = Math.min(startPos.x, offsetX);
    const y = Math.min(startPos.y, offsetY);
    context.clearRect(x, y, width, height);
  
    // Draw previous rectangles
    rectangles.forEach((rect) => {
      context.strokeRect(rect.x, rect.y, rect.width, rect.height);
    });
  
    // Draw the new rectangle
    context.strokeRect(x, y, width, height);
  };

  const stopDrawing = ({ nativeEvent }) => {
    setIsDrawing(false);
    const { offsetX, offsetY } = nativeEvent;
    const width = Math.abs(offsetX - startPos.x);
    const height = Math.abs(offsetY - startPos.y);
    const rect = {
      x: Math.min(startPos.x, offsetX),
      y: Math.min(startPos.y, offsetY),
      width,
      height,
    };
    setRectangles((prevRectangles) => [...prevRectangles, rect]);
  };
  
    return (
      <div>
        <h1>PDF Export</h1>
        <form>
          <input type="file" ref={fileRef} onChange={onFileChange} accept=".pdf" />
        </form>
        <canvas
          ref={canvasRef}
          style={{ border: "1px solid black" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        ></canvas>
      </div>
    );
};
  
export default PDFUploader;
