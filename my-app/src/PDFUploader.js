import React, { useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry";
import axios from 'axios';

pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.js";

const PDFUploader = () => {
    const fileRef = useRef();
    const canvasRef = useRef();
    const [isDrawing, setIsDrawing] = useState(false);
    const [rectangles, setRectangles] = useState([]);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [endPos, setEndPos] = useState({ x: 0, y: 0 });
    
  
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
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scale = canvas.width / rect.width;
      
        const x1 = Math.round((Math.min(startPos.x, offsetX) - rect.left) * scale);
        const y1 = Math.round((Math.min(startPos.y, offsetY) - rect.top) * scale);
        const x2 = Math.round((Math.max(startPos.x, offsetX) - rect.left) * scale);
        const y2 = Math.round((Math.max(startPos.y, offsetY) - rect.top) * scale);
      
        setRectangles((prevRectangles) => [  ...prevRectangles,  [x1, y1, x2, y2]
        ]);

          
      };      
      
      
      const handleSubmit = async (event) => {
        event.preventDefault();
        if (rectangles.length === 0) {
            console.error('No rectangles to process');
            return;
        }
        
        const lastRectangle = rectangles[rectangles.length - 1];
        const formattedRectangle = [
          lastRectangle[0], 
          lastRectangle[1], 
          lastRectangle[2], 
          lastRectangle[3]
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
            <form onSubmit={handleSubmit}>
                <input type="file" ref={fileRef} onChange={onFileChange} accept=".pdf" />
                {rectangles.length > 0 && (
                    <button type="submit">Submit</button>
        )}
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
