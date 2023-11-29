const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const JSZip = require('jszip');
const { zip } = require('zip-a-folder');

async function splitPdf(inputPath, outputPath) {
    const pdfBytes = await fs.promises.readFile(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const returnPages = [];

    for (let pageNumber = 0; pageNumber < pdfDoc.getPageCount(); pageNumber++) {
        const outputDoc = await PDFDocument.create();
        const [copiedPage] = await outputDoc.copyPages(pdfDoc, [pageNumber]);
        outputDoc.addPage(copiedPage);

        const outputPagePath = `${outputPath}pagina${pageNumber + 1}.pdf`;
        returnPages.push(outputPagePath);

        const outputBytes = await outputDoc.save();
        await fs.promises.writeFile(outputPagePath, outputBytes);
    }

    return returnPages;
}

function writeToFile(outputPath, outputFile, sequence, pdfMerger) {
    const outputFilePath = `${outputPath}${outputFile}_${sequence.toString().padStart(2, '0')}.pdf`;
    console.log(outputFilePath);
    fs.writeFileSync(outputFilePath, pdfMerger);
}

async function mergePdfs(inputPaths, outputPath, outputFile, maxFileSize) {
    const pdfMerger = await PDFDocument.create();
    let currentSize = 0;
    let sequence = 1;

    for (const path of inputPaths) {
        const pdfBytes = await fs.promises.readFile(path);
        const fileSize = await getFileSize(path);

        if (currentSize + fileSize > maxFileSize) {
            writeToFile(outputPath, outputFile, sequence, await pdfMerger.save());
            pdfMerger.reset();
            sequence += 1;
            currentSize = 0;
        }

        currentSize += fileSize;
        console.log(currentSize);
        const sourceDoc = await PDFDocument.load(pdfBytes);
        const copiedPages = await pdfMerger.copyPages(sourceDoc, [...Array(sourceDoc.getPageCount()).keys()]);
        copiedPages.forEach(page => pdfMerger.addPage(page));
    }

    writeToFile(outputPath, outputFile, sequence, await pdfMerger.save());

    for (const path of inputPaths) {
        await fs.promises.unlink(path);
    }
}

async function getFileSize(filePath) {
    const stats = await fs.promises.stat(filePath);
    return stats.size;
}

async function compressToZip(sourcePath, destinationPath) {
    const zip = new JSZip();

    const files = await fs.promises.readdir(sourcePath);
    for (const file of files) {
        console.log(file);
        if (file.endsWith('.zip')) {
            continue;
        }
        const fullPath = `${sourcePath}/${file}`;
        const relativePath = file;
        const fileData = await fs.promises.readFile(fullPath);
        zip.file(relativePath, fileData);
    }

    await zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
        .pipe(fs.createWriteStream(destinationPath));

    for (const file of files) {
        if (file.endsWith('.zip')) {
            continue;
        }
        await fs.promises.unlink(`${sourcePath}/${file}`);
    }
}

const inputPdfPath = "C:/Users/Diego/Desktop/AutoClickerSlayer/pdf/in/PFV ALCOI_SEPARATA TM ONIL.pdf";
const outputFile = inputPdfPath.split('/').slice(-1)[0].split('.')[0];
const outputPdfPath = "C:/Users/Diego/Desktop/AutoClickerSlayer/pdf/out/";
const maxFileSize = 12_000_000;

(async () => {
    // Llama a la función para separar el PDF
    const pages = await splitPdf(inputPdfPath, outputPdfPath);

    await mergePdfs(pages, outputPdfPath, outputFile, maxFileSize);

    await compressToZip(outputPdfPath, `${outputPdfPath}${outputFile}.zip`);
})();
