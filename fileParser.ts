
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import JSZip from 'jszip';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const parseFile = async (file: File): Promise<string> => {
    const fileType = file.name.split('.').pop()?.toLowerCase();

    switch (fileType) {
        case 'pdf':
            return await parsePDF(file);
        case 'docx':
        case 'doc': // basic support, might fail for old binary .doc
            return await parseDOCX(file);
        case 'pptx':
        case 'ppt': // basic support
            return await parsePPTX(file);
        default:
            throw new Error(`Unsupported file type: ${fileType}`);
    }
};

const parsePDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
    }

    return fullText;
};

const parseDOCX = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
};

const parsePPTX = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    let text = '';

    // PPTX structure: ppt/slides/slide1.xml, slide2.xml...
    const slideFiles = Object.keys(zip.files).filter((fileName) =>
        fileName.startsWith('ppt/slides/slide') && fileName.endsWith('.xml')
    );

    // Sort slides to maintain order
    slideFiles.sort((a, b) => {
        const numA = parseInt(a.replace(/[^0-9]/g, ''));
        const numB = parseInt(b.replace(/[^0-9]/g, ''));
        return numA - numB;
    });

    for (const slideFile of slideFiles) {
        const slideXml = await zip.file(slideFile)?.async('text');
        if (slideXml) {
            // Simple regex to extract text from XML tags (e.g. <a:t>Text</a:t>)
            // This is a naive approach but works for many PPTX files
            const matches = slideXml.match(/<a:t.*?>(.*?)<\/a:t>/g);
            if (matches) {
                const slideText = matches.map(m => m.replace(/<.*?>/g, '')).join(' ');
                text += slideText + '\n\n';
            }
        }
    }

    return text;
};
