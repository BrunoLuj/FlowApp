import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
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
        const doc = new jsPDF('l', 'mm', 'a4');
        const pageHeight = doc.internal.pageSize.height;

        // Funkcija za iscrtavanje headera
        const drawHeader = () => {
            doc.setFontSize(12);
        const column1X = 20; // Prvi stupac
        const column2X = 105; // Drugi stupac
        const column3X = 190; // Treći stupac
        const headerHeight = 20;

        // Crtanje okvira
        doc.rect(column1X - 5, 10, 60, headerHeight); // Lijevi stupac
        doc.rect(column2X - 5, 10, 80, headerHeight); // Srednji stupac
        doc.rect(column3X - 5, 10, 60, headerHeight); // Desni stupac

        // Ispisivanje sadržaja
        doc.text('Logo', column1X + 5, 20, { align: 'center' });
        doc.text('Izvještaj o rezultatima inspekcije za automatska mjerila nivoa tečnosti - AMN', column2X + 5, 20, { align: 'center' });
        doc.text('Oznaka dokumenta: ZA -19.04/03', column3X + 5, 20, { align: 'right' });
        };


        // Funkcija za iscrtavanje footera
        const drawFooter = () => {
            const footerY = pageHeight - 10; // Pozicija za footer
            doc.setFontSize(8);
            doc.text('Datum implementacije: 25.02.2022. Izdanje broj: 01 | Revizija broj: 04', 105, footerY, { align: 'center' });
            doc.text('Broj stranice: ' + doc.internal.getNumberOfPages(), 10, footerY);
        };

        // Dodaj header na prvu stranicu
        drawHeader();

        // Osnovne informacije
        doc.setFontSize(10);
        doc.text('Imenovana laboratorija: Čaljkušić d.o.o.', 10, 40);
        doc.text('Vlasnik/korisnik mjerila:', 10, 50);
        doc.text('Mjerilo predmet verifikacije: AMN', 10, 60);
        doc.text('Službena oznaka: BA D-8-1009', 10, 70);
        doc.text('Proizvođač: SEEBIT', 10, 80);
        doc.text('Tip: SEETAC S200, SEETAC K200', 10, 90);

        // Metode i procedure
        doc.text('Metode i procedure:', 10, 100);
        doc.text('• Inspekcija automatskih mjerila nivoa tečnosti - AMN (RU-19.04.)', 20, 110);
        doc.text('• Procedura za metode inspekcije (PR-19)', 20, 120);

        // Korištena mjerna oprema
        doc.text('Korištena mjerna oprema:', 10, 130);
        doc.text('• Mjerna letva/ALMIO/162-2019', 20, 140);
        doc.text('• Mjerna letva/ALMIO/0116-2016', 20, 145);
        doc.text('• Data Logger/MSR Electronic/410379', 20, 150);
        doc.text('• Termometar stakleni/Tlos Zagreb/212-2017', 20, 155);

        // Rezultati mjerenja
        let startY = 170; // Pozicija gdje počinju rezultati

        // Funkcija za dodavanje rezultata
        const addResults = (results) => {
            doc.autoTable({
                head: [['Proizvođač', 'Tip', 'Službena oznaka mjerila', 'Serijski broj', 'Broj mjerenja', 'Pokazivanje etalona (mm)', 'Pokazivanje AMN (mm)', 'Greška (mm)', 'GDG (mm)', 'T[ºC]', 'rH[%]', 'Provjera ispravnosti ugradnje', 'Provjera natpisa i oznaka', 'Provjera cjelovitosti i integriteta', 'Rezultati inspekcije']],
                body: results.map(result => [
                    'SEEBIT',
                    'SEETAC S200, SEETAC K200',
                    'BA D-8-1009',
                    result.probe,
                    result.measureCount,
                    result.referenceResults.join(', '),
                    result.amnResults.join(', '),
                    result.errors.join(', '),
                    '±4',
                    result.temperature,
                    result.humidity,
                    result.installationCheck ? 'OK' : 'Nije OK',
                    result.labelCheck ? 'OK' : 'Nije OK',
                    result.integrityCheck ? 'OK' : 'Nije OK',
                    result.inspectionResult ? 'Zadovoljava' : 'Ne zadovoljava',
                ]),
                startY: startY,
                theme: 'grid',
                styles: { cellPadding: 2, fontSize: 8 },
                headStyles: { fillColor: [22, 160, 133], textColor: [255, 255, 255] },
                margin: { top: 10, bottom: 10, left: 10, right: 10 },
            });

            // Ažuriraj poziciju za sljedeći sadržaj
            startY = doc.lastAutoTable.finalY + 10;

            // Ako je prešao visinu stranice, dodaj novu stranicu i header/footer
            if (startY > pageHeight - 30) {
                doc.addPage();
                startY = 10; // Resetiraj na vrh nove stranice
                drawHeader(); // Ponovo iscrtaj header
            }
        };

        // Pozovi funkciju za dodavanje rezultata
        addResults(inspectionResults);

        // Napomena
        doc.setFontSize(8);
        doc.text('* Napomena: Ispunjavanje prvog uvjeta prilikom umjeravanja, da odstupanje mjerenja etalona mora biti unutar vrijednosti 1mm.', 10, startY + 10);

        // Potpisnici
        doc.text('Mjeritelj: Marinko', 10, startY + 30);
        doc.text('Tehnički rukovoditelj: Bruno', 10, startY + 40);

        // Footer na posljednjoj stranici
        drawFooter();

        // Spremanje PDF-a
        doc.save('izvjestaj.pdf');
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
