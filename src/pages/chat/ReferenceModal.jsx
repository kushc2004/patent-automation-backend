import React, { useEffect, useRef, useState } from 'react';
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

const ReferenceModal = ({ pdfDocument, pageNumber, annotations, onClose }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);  // Reference to the scrollable container
    const [isRendering, setIsRendering] = useState(false);
    const [scale, setScale] = useState(1); // Default scale for zoom

    useEffect(() => {
        const renderPage = async () => {
            if (!pdfDocument || isRendering) return;

            setIsRendering(true);

            try {
                const page = await pdfDocument.getPage(pageNumber);
                const viewport = page.getViewport({ scale });  // Use dynamic scale

                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                // Set canvas dimensions based on the viewport size
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // Render the page
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };
                await page.render(renderContext).promise;

                // Get the original image dimensions
                const originalImageWidth = viewport.width;
                const originalImageHeight = viewport.height;

                // Scaling factors for adjusting the bounding box to the rendered size
                const scaleFactorX = canvas.width / originalImageWidth;
                const scaleFactorY = canvas.height / originalImageHeight;

                // Overlay annotations (highlight)
                if (annotations && annotations.length > 0) {
                    annotations.forEach(annotation => {
                        const { bounding_box } = annotation;
                        const { vertices } = bounding_box;

                        // Calculate bounding box coordinates with scaling
                        const x = vertices[0].x * scaleFactorX * scale ;
                        const y = vertices[0].y * scaleFactorY * scale ;
                        const width = (vertices[2].x - vertices[0].x) * scaleFactorX * scale;
                        const height = (vertices[2].y - vertices[0].y) * scaleFactorY * scale;

                        // Draw semi-transparent rectangle for highlight
                        context.beginPath();
                        context.rect(x, y, width, height);
                        context.fillStyle = 'rgba(255, 255, 0, 0.4)'; // Semi-transparent yellow
                        context.fill();
                        context.lineWidth = 1;
                        context.strokeStyle = '#FFFF00'; // Yellow border
                        context.stroke();
                    });
                }
            } catch (error) {
                console.error('Error rendering the page:', error);
            } finally {
                setIsRendering(false);
            }
        };

        renderPage();
    }, [pdfDocument, pageNumber, annotations, scale, isRendering]);

    // Function to zoom in
    const handleZoomIn = () => {
        setScale(prevScale => Math.min(prevScale + 0.2, 3)); // Limit max zoom to 3x
    };

    // Function to zoom out
    const handleZoomOut = () => {
        setScale(prevScale => Math.max(prevScale - 0.2, 0.5)); // Limit min zoom to 0.5x
    };

    // Function to reset zoom to the default
    const handleResetZoom = () => {
        setScale(1); // Reset scale to default
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-2/3 h-5/6 relative flex flex-col items-center overflow-auto" ref={containerRef}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-2xl text-gray-500 hover:text-gray-700">
                    &times;
                </button>

                {/* Zoom Controls */}
                <div className="absolute top-4 left-4 flex space-x-2 z-10">
                    <button
                        onClick={handleZoomIn}
                        className="bg-gray-200 text-gray-800 px-2 py-1 rounded-md shadow hover:bg-gray-300 mx-4">
                        +
                    </button>
                    <button
                        onClick={handleZoomOut}
                        className="bg-gray-200 text-gray-800 px-2 py-1 rounded-md shadow hover:bg-gray-300 mx-2">
                        -
                    </button>
                    <button
                        onClick={handleResetZoom}
                        className="bg-gray-200 text-gray-800 px-2 py-1 rounded-md shadow hover:bg-gray-300 mx-4">
                        Reset
                    </button>
                </div>

                {/* Scrollable Canvas Container */}
                <div className="w-full h-full overflow-auto">
                    {/* Canvas */}
                    <canvas ref={canvasRef} className="border m-auto" />
                </div>
            </div>
        </div>
    );
};

export default ReferenceModal;
