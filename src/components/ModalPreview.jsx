// src/components/ModalPreview.jsx
import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";

// Set the workerSrc property
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const ModalPreview = ({ selectedFile }) => {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    const goToPrevPage = () =>
        setPageNumber((prevPageNumber) => Math.max(prevPageNumber - 1, 1));
    const goToNextPage = () =>
        setPageNumber((prevPageNumber) =>
            Math.min(prevPageNumber + 1, numPages)
        );

    return (
        <div className="flex flex-col items-center">
            <Document
                file={selectedFile.path}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<div>Loading PDF...</div>}
                error={<div>Failed to load PDF.</div>}
            >
                <Page pageNumber={pageNumber} width={600} />
            </Document>
            <div className="flex items-center mt-2 space-x-4">
                <button
                    onClick={goToPrevPage}
                    disabled={pageNumber <= 1}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
                >
                    Previous
                </button>
                <span>
                    Page {pageNumber} of {numPages}
                </span>
                <button
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default ModalPreview;
