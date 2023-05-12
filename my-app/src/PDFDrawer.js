import React, { useEffect, useState, useRef, useCallback } from "react";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";
import * as pdfjsLib from "pdfjs-dist/build/pdf";

export default function CustomPdfReader() {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

  const canvasRef = useRef();
  const [pdfRef, setPdfRef] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const currentPage = 1;
  const zoomScale = 1;
  const rotateAngle = 0;
  var pdf_image = "";

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    const url = URL.createObjectURL(file);
    setFileUrl(url);
  };

  let renderTask = null;

  const renderPage = useCallback(
    (pageNum, pdf = pdfRef) => {
      pdf &&
        pdf.getPage(pageNum).then(function (page) {
          const viewport = page.getViewport({ scale: zoomScale, rotation: rotateAngle });
          const canvas = canvasRef.current;
          canvas.height = viewport?.height;
          canvas.width = viewport?.width;
          const renderContext = {
            canvasContext: canvas?.getContext("2d"),
            viewport: viewport,
          };

          // cancel previous render task
          renderTask && renderTask.cancel();

          renderTask = page.render(renderContext);
        });
    },
    [pdfRef, fileUrl]
  );

  useEffect(() => {
    if (fileUrl) {
      const loadingTask = pdfjsLib.getDocument(fileUrl);
      loadingTask.promise.then(
        (loadedPdf) => {
          setPdfRef(loadedPdf);
          renderPage(currentPage, loadedPdf);
        },
        function (reason) {
          console.error(reason);
        }
      );
    }
  }, [fileUrl, renderPage]);

  useEffect(() => {
    return () => {
      // cancel render task on unmount
      renderTask && renderTask.cancel();
    };
  }, []);

  var cursorInCanvas = false;
  var canvasOfDoc = canvasRef?.current;
  var ctx;
  var startX;
  var startY;
  var offsetX;
  var offsetY;

  const saveInitialCanvas = () => {
    if (canvasOfDoc?.getContext) {
      var canvasPic = new Image();
      canvasPic.src = canvasOfDoc.toDataURL();
      pdf_image = canvasPic;
    }
  };

  useEffect(() => {
    if (canvasOfDoc) {
      ctx = canvasOfDoc.getContext("2d");
      var canvasOffset = canvasOfDoc.getBoundingClientRect();
      offsetX = canvasOffset.left;
      offsetY = canvasOffset.top;
    }
  }, [canvasOfDoc, pdfRef, renderPage, fileUrl]);

  useEffect(() => {
    if (!canvasOfDoc || !renderTask) return;

    const handleMouseIn = (e) => {
        if (typeof pdf_image == "string") {
            saveInitialCanvas();
          }
          e.preventDefault();
          e.stopPropagation();
          startX = ((e.offsetX * canvasOfDoc.width) / canvasOfDoc.clientWidth) | 0;
          startY = ((e.offsetY * canvasOfDoc.width) / canvasOfDoc.clientWidth) | 0;
      
          cursorInCanvas = true;
    }

    const handleMouseOut = (e) => {
        e.preventDefault();
        e.stopPropagation();
        cursorInCanvas = false;
    }

    const handleMouseMove = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!cursorInCanvas) {
          return;
        }
        let mouseX = ((e.offsetX * canvasOfDoc.width) / canvasOfDoc.clientWidth) | 0;
        let mouseY = ((e.offsetY * canvasOfDoc.width) / canvasOfDoc.clientWidth) | 0;
    
        var width = mouseX - startX;
        var height = mouseY - startY;
        if (ctx) {
          ctx?.clearRect(0, 0, canvasOfDoc.width, canvasOfDoc.height);
          ctx?.drawImage(pdf_image, 0, 0);
          ctx.beginPath();
          ctx.rect(startX, startY, width, height);
          ctx.strokeStyle = "#1B9AFF";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
    }

    canvasOfDoc.addEventListener("mousedown", handleMouseIn);
    canvasOfDoc.addEventListener("mousemove", handleMouseMove);
    canvasOfDoc.addEventListener("mouseup", handleMouseOut);
    canvasOfDoc.addEventListener("mouseout", handleMouseOut);

    return () => {
      canvasOfDoc.removeEventListener("mousedown", handleMouseIn);
      canvasOfDoc.removeEventListener("mousemove", handleMouseMove);
      canvasOfDoc.removeEventListener("mouseup", handleMouseOut);
      canvasOfDoc.removeEventListener("mouseout", handleMouseOut);
    };
  }, [canvasOfDoc, renderTask]);

  return (
    <>
      <input type="file" onChange={handleFileChange} accept=".pdf" />
      <canvas id="pdf-doc" ref={canvasRef} />
    </>
  );
}
