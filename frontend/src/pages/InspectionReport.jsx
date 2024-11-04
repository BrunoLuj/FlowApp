import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts'; // koristi virtualne fontove

pdfMake.vfs = pdfFonts.pdfMake.vfs;

const InspectionReport = ({ reportData, inspectionResults }) => {

    const componentRef = useRef();

    // const handleDownloadPDF = () => {
    //     const documentDefinition = {
    //         content: [
    //             {
    //                 table: {
    //                     widths: ['*', '*', '*'],
    //                     body: [
    //                         [
    //                             { text: 'Logo', alignment: 'center', style: 'header' },
    //                             {
    //                                 text: 'Izvještaj o rezultatima inspekcije za automatska mjerila nivoa tečnosti - AMN',
    //                                 alignment: 'center',
    //                                 colSpan: 2,
    //                                 style: 'header',
    //                             },
    //                             {},
    //                         ],
    //                     ],
    //                 },
    //                 layout: 'noBorders',
    //             },
    //             {
    //                 style: 'normal',
    //                 table: {
    //                     widths: ['*', '*'],
    //                     body: [
    //                         [{ text: 'Imenovana laboratorija:', bold: true }, { text: 'Čaljkušić d.o.o.', alignment: 'right' }],
    //                         [{ text: 'Vlasnik/korisnik mjerila:', bold: true }, { text: '____________________', alignment: 'right' }],
    //                         [{ text: 'Mjerilo predmet verifikacije:', bold: true }, { text: 'AMN', alignment: 'right' }],
    //                         [{ text: 'Službena oznaka:', bold: true }, { text: 'BA D-8-1009', alignment: 'right' }],
    //                         [{ text: 'Proizvođač:', bold: true }, { text: 'SEEBIT', alignment: 'right' }],
    //                         [{ text: 'Tip:', bold: true }, { text: 'SEETAC S200, SEETAC K200', alignment: 'right' }],
    //                         [{ text: 'Broj i datum zahtjeva inspekcije:', bold: true }, { text: '____________________', alignment: 'right' }],
    //                     ],
    //                 },
    //                 layout: {
    //                     hLineWidth: () => 1,
    //                     vLineWidth: () => 0,
    //                     hLineColor: () => '#000',
    //                     paddingLeft: () => 4,
    //                     paddingRight: () => 4,
    //                     paddingTop: () => 4,
    //                     paddingBottom: () => 4,
    //                 },
    //             },
    //             {
    //                 text: 'Metode i procedure:',
    //                 style: 'normal',
    //             },
    //             {
    //                 ul: [
    //                     'Inspekcija automatskih mjerila nivoa tečnosti - AMN (RU-19.04.)',
    //                     'Procedura za metode inspekcije (PR-19)',
    //                 ],
    //             },
    //             {
    //                 text: 'Korištena mjerna oprema:',
    //                 style: 'normal',
    //             },
    //             {
    //                 ul: [
    //                     'Mjerna letva/ALMIO/162-2019',
    //                     'Mjerna letva/ALMIO/0116-2016',
    //                     'Data Logger/MSR Electronic/410379',
    //                     'Termometar stakleni/Tlos Zagreb/212-2017',
    //                 ],
    //             },
    //             {
    //                 text: 'REZULTATI MJERENJA',
    //                 style: 'header',
    //                 margin: [0, 20],
    //             },
    //             {
    //                 table: {
    //                     widths: ['*', '*', '*', '*', '*', '*', '*', '*', '*', '*', '*', '*', '*', '*', '*'],
    //                     body: [
    //                         [
    //                             { text: 'Proizvođač', style: 'tableHeader' },
    //                             { text: 'Tip', style: 'tableHeader' },
    //                             { text: 'Službena oznaka mjerila', style: 'tableHeader' },
    //                             { text: 'Serijski broj', style: 'tableHeader' },
    //                             { text: 'Broj mjerenja', style: 'tableHeader' },
    //                             { text: 'Pokazivanje etalona (mm)', style: 'tableHeader' },
    //                             { text: 'Pokazivanje AMN (mm)', style: 'tableHeader' },
    //                             { text: 'Greška (mm)', style: 'tableHeader' },
    //                             { text: 'GDG (mm)', style: 'tableHeader' },
    //                             { text: 'T[ºC]', style: 'tableHeader' },
    //                             { text: 'rH[%]', style: 'tableHeader' },
    //                             { text: 'Provjera ispravnosti ugradnje', style: 'tableHeader' },
    //                             { text: 'Provjera natpisa i oznaka', style: 'tableHeader' },
    //                             { text: 'Provjera cjelovitosti i integriteta', style: 'tableHeader' },
    //                             { text: 'Rezultati inspekcije', style: 'tableHeader' },
    //                         ],
    //                         ...inspectionResults.map(result => [
    //                             'SEEBIT',
    //                             'SEETAC S200, SEETAC K200',
    //                             'BA D-8-1009',
    //                             result.probe,
    //                             '1, 2, 3',
    //                             result.referenceResults.join(', '),
    //                             result.amnResults.join(', '),
    //                             result.errors.join(', '),
    //                             '±4',
    //                             result.temperature,
    //                             result.humidity,
    //                             result.installationCheck ? 'OK' : 'Nije OK',
    //                             result.labelCheck ? 'OK' : 'Nije OK',
    //                             result.integrityCheck ? 'OK' : 'Nije OK',
    //                             result.inspectionResult ? 'Zadovoljava' : 'Ne zadovoljava',
    //                         ]),
    //                     ],
    //                 },
    //                 layout: {
    //                     hLineWidth: () => 1,
    //                     vLineWidth: () => 1,
    //                     hLineColor: () => '#000',
    //                     vLineColor: () => '#000',
    //                     paddingLeft: () => 4,
    //                     paddingRight: () => 4,
    //                     paddingTop: () => 4,
    //                     paddingBottom: () => 4,
    //                 },
    //             },
    //             {
    //                 text: '* Napomena: Ispunjavanje prvog uvjeta prilikom umjeravanja, da odstupanje mjerenja etalona mora biti unutar vrijednosti 1mm.',
    //                 style: 'note',
    //                 margin: [0, 10],
    //             },
    //             {
    //                 text: 'M.P.',
    //                 style: 'footer',
    //                 alignment: 'center',
    //                 margin: [0, 20],
    //             },
    //             {
    //                 table: {
    //                     widths: ['*', '*', '*'],
    //                     body: [
    //                         [
    //                             { text: 'Mjeritelj: Marinko', style: 'footer' },
    //                             { text: 'Tehnički rukovoditelj: Bruno', style: 'footer' },
    //                             { text: 'Broj stranice', style: 'footer', alignment: 'center' },
    //                         ],
    //                     ],
    //                 },
    //                 layout: 'noBorders',
    //             },
    //             {
    //                 text: 'Datum implementacije: 25.02.2022. Izdanje broj: 01 | Revizija broj: 04',
    //                 style: 'normal',
    //                 alignment: 'center',
    //             },
    //         ],
    //         styles: {
    //             header: { fontSize: 14, bold: true, margin: [0, 10, 0, 10] },
    //             normal: { fontSize: 10, margin: [0, 5] },
    //             tableHeader: { fillColor: '#f3f3f3', bold: true, fontSize: 9, margin: [0, 5] },
    //             note: { fontSize: 9, italics: true, margin: [0, 10] },
    //             footer: { fontSize: 10, margin: [0, 20] },
    //         },
    //     };

    //     pdfMake.createPdf(documentDefinition).download('izvjestaj.pdf');
    // };

    
    const generatePDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orijentacija
        const pageHeight = doc.internal.pageSize.height;
    
        // Funkcija za iscrtavanje headera u landscape orijentaciji
        const drawHeader = () => {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.text('Izvještaj o rezultatima inspekcije za automatska mjerila nivoa tečnosti - AMN', 148.5, 10, { align: 'center' });
            
            doc.setFontSize(10);
            doc.text('Oznaka dokumenta: ZA -19.04/03', 287 - 10, 10, { align: 'right' });
    
            // Linija ispod headera
            doc.setLineWidth(0.5);
            doc.line(10, 15, 287 - 10, 15); 
        };
    
        // Funkcija za unos osnovnih podataka
        const drawInspectionDetails = () => {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            const details = [
                'Imenovana laboratorija: Čaljkušić d.o.o.',
                'Vlasnik/korisnik mjerila: <kupac>',
                'Mjerilo predmet verifikacije: AMN',
                'Službena oznaka: BA D-8-1009',
                'Proizvođač: SEEBIT',
                'Tip: SEETAC S200, SEETAC K200'
            ];
    
            details.forEach((text, index) => {
                doc.text(text, 10, 25 + index * 10);
            });
        };
    
        // Funkcija za unos metoda i procedure
        const drawMethods = () => {
            doc.text('Metode i procedure:', 10, 90);
            doc.text('• Inspekcija automatskih mjerila nivoa tečnosti - AMN (RU-19.04.)', 20, 100);
            doc.text('• Procedura za metode inspekcije (PR-19)', 20, 110);
        };
    
        // Funkcija za unos korištene mjerne opreme
        const drawEquipment = () => {
            doc.text('Korištena mjerna oprema:', 10, 120);
            const equipment = [
                'Mjerna letva/ALMIO/162-2019',
                'Mjerna letva/ALMIO/0116-2016',
                'Data Logger/MSR Electronic/410379',
                'Termometar stakleni/Tlos Zagreb/212-2017'
            ];
    
            equipment.forEach((item, index) => {
                doc.text(`• ${item}`, 20, 130 + index * 5);
            });
        };
    
        // Funkcija za unos tablice rezultata mjerenja
        const addResults = (results) => {
            doc.autoTable({
                head: [['Proizvođač', 'Tip', 'Službena oznaka mjerila', 'Serijski broj', 'Broj mjerenja', 'Pokazivanje etalona (mm)', 'Pokazivanje AMN (mm)', 'Greška (mm)', 'GDG (mm)', 'T[ºC]', 'rH[%]', 'Provjera ispravnosti ugradnje', 'Provjera natpisa i oznaka', 'Provjera cjelovitosti i integriteta', 'Rezultati inspekcije']],
                body: results.map(result => [
                    'SEEBIT',
                    'SEETAC S200, SEETAC K200',
                    'BA D-8-1009',
                    result.serialNumber,
                    result.measureCount,
                    result.referenceResults.join(', '),
                    result.amnResults.join(', '),
                    result.errors.join(', '),
                    '±4',
                    result.temperature,
                    result.humidity,
                    result.installationCheck ? '✓' : '✗',
                    result.labelCheck ? '✓' : '✗',
                    result.integrityCheck ? '✓' : '✗',
                    result.inspectionResult ? 'Zadovoljava' : 'Ne zadovoljava',
                ]),
                startY: 150,
                theme: 'grid',
                styles: { 
                    cellPadding: 2, 
                    fontSize: 8, 
                    halign: 'center',
                    overflow: 'linebreak' 
                },
                headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
                bodyStyles: { textColor: 50 },
                columnStyles: {
                    0: { cellWidth: 20 },
                    1: { cellWidth: 30 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 20 },
                    5: { cellWidth: 25 },
                    6: { cellWidth: 25 },
                    7: { cellWidth: 20 },
                    8: { cellWidth: 20 },
                    9: { cellWidth: 15 },
                    10: { cellWidth: 15 },
                    11: { cellWidth: 25 },
                    12: { cellWidth: 25 },
                    13: { cellWidth: 25 },
                    14: { cellWidth: 35 }
                }
            });
        };
    
        // Napomena i potpisi
        const drawFooter = () => {
            doc.setFontSize(8);
            doc.text('* Napomena: Ispunjavanje prvog uvjeta prilikom umjeravanja, da odstupanje mjerenja etalona mora biti unutar vrijednosti 1mm.', 10, doc.lastAutoTable.finalY + 10);
            doc.text('Mjeritelj: <ime mjeritelja>', 10, doc.lastAutoTable.finalY + 30);
            doc.text('Tehnički rukovoditelj: Bruno', 10, doc.lastAutoTable.finalY + 40);
            doc.text('Datum implementacije: 25.02.2022. Izdanje broj: 01 | Revizija broj: 04', 148.5, pageHeight - 10, { align: 'center' });
        };
    
        // Dodaj sve dijelove na PDF
        drawHeader();
        drawInspectionDetails();
        drawMethods();
        drawEquipment();
        addResults(inspectionResults); // Preuzmi rezultate iz izvora podataka
        drawFooter();
    
        // Spremi PDF
        doc.save('AMN_rezultati_inspekcije.pdf');
    };
    


    return (
        <div className="p-4" ref={componentRef}>
            {/* <button onClick={handlePrint} className="mb-4 px-4 py-2 bg-blue-500 text-white rounded">
                Štampaj Izvještaj
            </button> */}
            <button onClick={generatePDF} className="mb-4 px-4 py-2 bg-green-500 text-white rounded">
                Spremi kao PDF
            </button>
            {/* Header */}
            <div className="flex justify-between mb-4 border-b-2 border-t-2 border-l-2 border-r-2 text-sm">
                <div className="flex-1 text-center border-r-2"><strong>Logo</strong></div>
                <div className="flex-1 text-center border-r-2"><strong>Izvještaj o rezultatima inspekcije za automatska mjerila nivoa  tečnosti - AMN</strong></div>
                <div className="flex-1 text-center"><strong>Oznaka dokumenta : </strong>
                    <div className="flex-1 text-center border-t-2"><strong>ZA -19.04/03</strong>
                    </div>
                </div>
            </div>

            <div className="mb-6 text-sm">
                <div className="flex mb-4 border-b-2">
                    <strong>Imenovana laboratorija:</strong> 
                    <div className='ml-56'>Čaljkušić d.o.o.</div>
                </div>
                <div className="flex mb-4">
                    <strong>Vlasnik/korisnik mjerila:</strong>
                    <div className='ml-4'></div>
                </div>
                <div className="flex mb-4">
                    <strong>Mjerilo predmet verifikacije:</strong> 
                    <div className='ml-4'>AMN</div>
                </div>
                <div className="flex mb-4">
                    <strong>Službena oznaka:</strong> 
                    <div className='ml-4'>BA D-8-1009</div>
                    
                </div>
                <div className="flex mb-4">
                    <strong>Proizvođač:</strong> 
                    <div className='ml-4'>SEEBIT</div>   
                </div>
                <div className="flex mb-4">
                    <strong>Tip:</strong> 
                    <div className='ml-4'>SEETAC S200, SEETAC K200</div>     
                </div>
                <div className="flex mb-4">
                    <strong >Broj i datum zahtjeva inspekcije:</strong>
                    <div className='ml-4'></div>
                </div>
                <div className="flex mb-4">
                    <strong >Metode i procedure:</strong> 
                    <div className='ml-4'>
                        <ul>
                            <li>Inspekcija automatskih mjerila nivoa tečnosti - AMN (RU-19.04.)</li>
                            <li>Procedura za metode inspekcije (PR-19)</li>
                        </ul>
                    </div> 
                </div>
                <div className="flex mb-4 border-t-2 border-b-2">
                    <strong >Korištena mjerna oprema:</strong> 
                    <div className='ml-4'>
                        <ul className="list-disc pl-6 mb-6">
                            <li>Mjerna letva/ALMIO/162-2019</li>
                            <li>Mjerna letva/ALMIO/0116-2016</li>
                            <li>Data Logger/MSR Electronic/410379</li>
                            <li>Termometar stakleni/Tlos Zagreb/212-2017</li>
                        </ul>
                    </div> 
                </div>
            </div>

            <div className="font-semibold mb-2 justify-center flex border-b-2 border-t-2 border-l-2 border-r-2 fill-gray-600 bg-gray-500s">REZULTATI MJERENJA</div>
            <table className="text-xs w-full bg-white border border-gray-300 mb-1">
                <thead>
                    <tr>
                        <th className="border px-2 sm:px-4 py-2">Proizvođač</th>
                        <th className="border px-2 sm:px-4 py-2">Tip</th>
                        <th className="border px-2 sm:px-4 py-2">Službena oznaka mjerila</th>
                        <th className="border px-2 sm:px-4 py-2">Serijski broj</th>
                        <th className="border px-2 sm:px-4 py-2">Broj mjerenja</th>
                        <th className="border px-2 sm:px-4 py-2">Pokazivanje etalona (mm)</th>
                        <th className="border px-2 sm:px-4 py-2">Pokazivanje AMN (mm)</th>
                        <th className="border px-2 sm:px-4 py-2">Greška (mm)</th>
                        <th className="border px-2 sm:px-4 py-2">GDG (mm)</th>
                        <th className="border px-2 sm:px-4 py-2">T[ºC]</th>
                        <th className="border px-2 sm:px-4 py-2">rH[%]</th>
                        <th className="border px-2 sm:px-4 py-2">Provjera ispravnosti ugradnje</th>
                        <th className="border px-2 sm:px-4 py-2">Provjera natpisa i oznaka</th>
                        <th className="border px-2 sm:px-4 py-2">Provjera cjelovitosti i integriteta</th>
                        <th className="border px-2 sm:px-4 py-2">Rezultati inspekcije</th>
                    </tr>
                </thead>
                <tbody>
                    {inspectionResults.map((result, index) => (
                        <tr key={index}>
                            <td className="border px-2 sm:px-4 py-2">SEEBIT</td>
                            <td className="border px-2 sm:px-4 py-2">SEETAC S200, SEETAC K200</td>
                            <td className="border px-2 sm:px-4 py-2">BA D-8-1009</td>
                            <td className="border px-2 sm:px-4 py-2">{result.probe}</td>
                            <td className="border text-center ">
                                <div className="border-b-2">{1.}</div>
                                <div className="border-b-2">{2.}</div>
                                <div className="">{3.}</div>
                            </td>
                            <td className="border text-center ">
                                <div className="border-b-2">{result.referenceResults[0]}</div>
                                <div className="border-b-2">{result.referenceResults[1]}</div>
                                <div className="">{result.referenceResults[2]}</div>
                            </td>
                            <td className="border text-center ">
                                <div className="border-b-2">{result.amnResults[0]}</div>
                                <div className="border-b-2">{result.amnResults[1]}</div>
                                <div className="">{result.amnResults[2]}</div>
                            </td>
                            <td className="border text-center ">
                                <div className="border-b-2">{result.errors[0]}</div>
                                <div className="border-b-2">{result.errors[1]}</div>
                                <div className="">{result.errors[2]}</div>
                            </td>
                            <td className="border text-center ">
                                <div className="border-b-2">±{4}</div>
                                <div className="border-b-2">±{4}</div>
                                <div className="">±{4}</div>
                            </td>
                            <td className="border px-2 sm:px-4 py-2">{result.temperature}</td>
                            <td className="border px-2 sm:px-4 py-2">{result.humidity}</td>
                            <td className="border px-2 sm:px-4 py-2">{result.installationCheck ? "OK" : "Nije OK"}</td>
                            <td className="border px-2 sm:px-4 py-2">{result.labelCheck ? "OK" : "Nije OK"}</td>
                            <td className="border px-2 sm:px-4 py-2">{result.integrityCheck ? "OK" : "Nije OK"}</td>
                            <td className="border px-2 sm:px-4 py-2">{result.inspectionResult ? "Zadovoljava" : "Ne zadovoljava"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="text-xs">
                <strong>* Napomena:</strong> Ispunjavanje prvog uvjeta prilikom umjeravanja, da odstupanje mjerenja etalona mora biti unutar vrijednosti 1mm tj. sve tri vrijednosti mjerenja etalona za istu sondu moraju biti unutar 1mm. Ako je odstupanje veće, ne ispunjava se prvi uvjet da su rezultati mjerenja ispravni.
            </div>

            <div className="flex justify-center mb-4 mt-8 text-sm">
                <div className="flex-1 text-right">
                    <strong>
                        <div className='mr-4'>Mjeritelj:</div>
                    </strong>
                </div>
                <div className="flex-1 text-left">
                    <div className="flex-1 text-center">
                        <strong>Marinko</strong>
                    </div>
                    <div className="flex-1 text-center border-t-2">
                        <strong>Marinko</strong>
                    </div>
                </div>
                <div className="flex-1 text-right">
                    <strong>
                        <div className='mr-4'>Tehnički rukovoditelj:</div>
                    </strong>
                </div>
                <div className="flex-1 text-left">
                    <div className="flex-1 text-center">
                        <strong>Bruno</strong>
                    </div>
                    <div className="flex-1 text-center border-t-2">
                        <strong>Bruno</strong>
                    </div>
                </div>
            </div>

            <div className="mt-6 justify-center flex text-xs">
                <div>M.P.</div>
            </div>

            {/* Footer */}
            <div className="flex justify-between mt-6 border-b-2 border-t-2 border-l-2 border-r-2 text-sm">
                <div className="flex-1 text-center border-r-2"><strong>Logo Bata</strong></div>
                <div className="flex-1 text-center border-r-2">
                    <strong>
                        Datum implementacije: 25.02.2022.Izdanje broj: 01 | Revizija broj: 04
                    </strong>
                </div>
                <div className="flex-1 text-center"><strong>Broj stranice</strong></div>
            </div>
        </div>
    );
};

export default InspectionReport;
