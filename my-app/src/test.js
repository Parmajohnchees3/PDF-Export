import React, { useEffect, useState, useRef } from "react";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";
import * as pdfjsLib from "pdfjs-dist/build/pdf";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function CustomPdfReader() {
  const canvasRef = useRef();
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [pdfImage, setPdfImage] = useState(null);
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        const typedArray = new Uint8Array(this.result);
        loadDocument(typedArray);
      };
      reader.readAsArrayBuffer(file);
    }
  };
  
  const loadDocument = async (data) => {
    const doc = await pdfjsLib.getDocument({data}).promise;
    setPdfDoc(doc);
  };
  
  // Render the page on pageNum, scale, rotation or document changes
  useEffect(() => {
    if (pdfDoc) renderPage(pageNum);
  }, [pageNum, scale, rotation, pdfDoc]);

  const renderPage = async (num) => {
    if (!pdfDoc) return;

    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale, rotation });

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport
    };

    await page.render(renderContext).promise;
    
    // Save the rendered PDF as an image
    const img = new Image();
    img.src = canvas.toDataURL();
    setPdfImage(img);
  };

  // Drawing functions
  const [isDrawing, setIsDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);

  const handleMouseDown = (e) => {
    const mouseX = e.nativeEvent.offsetX;
    const mouseY = e.nativeEvent.offsetY;

    setStartX(mouseX);
    setStartY(mouseY);
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    
    const mouseX = e.nativeEvent.offsetX;
    const mouseY = e.nativeEvent.offsetY;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (pdfImage) {
      context.drawImage(pdfImage, 0, 0);
    }
    
    context.beginPath();
    context.rect(startX, startY, mouseX - startX, mouseY - startY);
    context.strokeStyle = "#1B9AFF";
    context.lineWidth = 1;
    context.stroke();
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  return (
    <div>
      <h1>PDF Export</h1>
      <input type="file" onChange={handleFileChange} accept=".pdf" />
      {pdfDoc && <button onClick={() => renderPage(pageNum)}>Submit</button>}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseOut={handleMouseUp}
      />
    </div>
  );

  }