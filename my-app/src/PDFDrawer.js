import React, { useEffect, useState, useRef } from "react";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import axios from 'axios';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function CustomPdfReader() {
  const canvasRef = useRef();
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [pdfImage, setPdfImage] = useState(null);
  const [fileSelected, setFileSelected] = useState(false);
  const [rectangles, setRectangles] = useState([]);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileSelected(true);
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

  const handleMouseDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setStartX(mouseX);
    setStartY(mouseY);
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

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

  const handleMouseUp = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    let width = mouseX - startX;
    let height = mouseY - startY;
    let x = startX;
    let y = startY;
  
    // If the width is negative, the rectangle was drawn to the left.
    // We adjust the x coordinate and make the width positive.
    if (width < 0) {
      x = mouseX;
      width = -width;
    }
  
    // If the height is negative, the rectangle was drawn upwards.
    // We adjust the y coordinate and make the height positive.
    if (height < 0) {
      y = mouseY;
      height = -height;
    }
  
    const rectangle = [x, y, width, height];
    setRectangles(rectangles => [...rectangles, rectangle]);
    setIsDrawing(false);
  };
  

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (rectangles.length === 0) {
      console.error('No rectangles to process');
      return;
    }
  
    const lastRectangle = rectangles[rectangles.length - 1];
    const formattedRectangle = [
      Number(lastRectangle[0]), 
      Number(lastRectangle[1]), 
      Number(lastRectangle[2]), 
      Number(lastRectangle[3])
    ];

    try {
        const response = await axios.post('http://127.0.0.1:5000/process_rectangles', { rectangles: [formattedRectangle] });
        if (response.status === 200) {
            console.log('Rectangles processed successfully');
        } else {
            console.error('Failed to process rectangles');
        }
    } catch (error) {
        console.error(error);
    }
  };

  return (
    <div>
      <h1>PDF Export</h1>
      <input type="file" onChange={handleFileChange} accept=".pdf" />
      {fileSelected && <button onClick={handleSubmit}>Submit</button>}
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