import React, { useRef } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.pdfMake.vfs; // Ovo omogućava pdfMake da koristi fontove

const InspectionReport = ({ reportData, inspectionResults }) => {
    const generatePDF = () => {
        const documentDefinition = {
            pageSize: 'A4',
            pageOrientation: 'landscape',
            pageMargins: [40, 60, 40, 60],
            header: {
                table: {
                    widths: ['25%', '55%', '20%'],
                    body: [
                        [
                            { text: 'Logo', bold: true, rowSpan: 2, style: 'headerText' }, // Spajanje prvog stupca kroz dva reda
                            { text: 'Izvještaj o rezultatima inspekcije za automatska mjerila nivoa tečnosti - AMN', style: 'headerText', rowSpan: 2 }, // Spajanje drugog stupca kroz dva reda
                            { text: 'Oznaka dokumenta : ', alignment: 'center' } // Treći stupac
                        ],
                        [
                            {}, // Prazna ćelija za prvi stupac
                            {}, // Prazna ćelija za drugi stupac
                            { text: 'ZA -19.04/03', alignment: 'center' } // Treći stupac
                        ],
                        // Novi red ispod
                        [
                            { text: 'Broj izvještaja : <broj>', alignment: 'right' }, // Prvi stupac
                            {}, // Prazna ćelija za drugi stupac
                            { text: 'Osoba odgovorna za vođenje aktivnosti: Rukovoditelj IT', alignment: 'right' } // Treći stupac
                        ]
                    ],
                },
                // layout: 'noBorders', // Postavi bez granica
                margin: [40, 20], // Margine zaglavlja
            },
            content: [
                // Dodaj informacije o laboratoriji
                {
                    style: 'normal',
                    table: {
                        widths: ['20%', '80%'],
                        body: [
                            [{ text: 'Imenovana laboratorija:', bold: true }, { text: 'IT Čaljkušić d.o.o.', alignment: 'center' }],
                            [{ text: 'Vlasnik/korisnik mjerila:', bold: true }, { text: '<kupac>', alignment: 'left' }],
                            [{ text: 'Mjerilo predmet verifikacije:', bold: true }, { text: 'AMN', alignment: 'left' }],
                            [{ text: 'Službena oznaka:', bold: true }, { text: 'BA D-8-1009', alignment: 'left' }],
                            [{ text: 'Proizvođač:', bold: true }, { text: 'SEEBIT', alignment: 'left' }],
                            [{ text: 'Tip:', bold: true }, { text: 'SEETAC S200, SEETAC K200', alignment: 'left' }],
                        ],
                    },
                    layout: {
                        hLineWidth: (i, node) => {
                            // Prvi red sa granicom
                            if (i === 1 || i === 6) return 1; // Horizontalne linije za prve 4 reda
                            return 0; // Uklanja horizontalne linije za ostale redove
                        },
                        vLineWidth: (i, node) => {
                            // Granice između kolona
                            return (i === 0) ? 0 : 0; // Prva vertikalna linija (između prvog i drugog stupca)
                        },
                        hLineColor: (i, node) => {
                            return 'black'; // Boja horizontalnih linija
                        },
                        vLineColor: (i, node) => {
                            return 'black'; // Boja vertikalnih linija
                        },
                        paddingLeft: (i, node) => {
                            return 5; // Padding sa leve strane
                        },
                        paddingRight: (i, node) => {
                            return 5; // Padding sa desne strane
                        },
                        paddingTop: (i, node) => {
                            return 10; // Padding sa vrha
                        },
                        paddingBottom: (i, node) => {
                            return 5; // Padding sa dna
                        },
                    },
                },
                // Dodaj metode i procedure
                {
                    text: 'Metode i procedure:',
                    style: 'normal',
                },
                {
                    ul: [
                        'Inspekcija automatskih mjerila nivoa tečnosti - AMN (RU-19.04.)',
                        'Procedura za metode inspekcije (PR-19)',
                    ],
                },
                // Dodaj korišćenu mjerna oprema
                {
                    text: 'Korištena mjerna oprema:',
                    style: 'normal',
                },
                {
                    ul: [
                        'Mjerna letva/ALMIO/162-2019',
                        'Mjerna letva/ALMIO/0116-2016',
                        'Data Logger/MSR Electronic/410379',
                        'Termometar stakleni/Tlos Zagreb/212-2017',
                    ],
                },
                // Rezultati mjerenja
                {
                    text: 'REZULTATI MJERENJA',
                    style: 'header',
                    margin: [0, 20],
                },
                {
                    table: {
                        widths: ['*', '*', '*', '*', '*', '*', '*', '*', '*', '*', '*', '*', '*', '*', '*'],
                        body: [
                            [
                                { text: 'Proizvođač', style: 'tableHeader' },
                                { text: 'Tip', style: 'tableHeader' },
                                { text: 'Službena oznaka mjerila', style: 'tableHeader' },
                                { text: 'Serijski broj', style: 'tableHeader' },
                                { text: 'Broj mjerenja', style: 'tableHeader' },
                                { text: 'Pokazivanje etalona (mm)', style: 'tableHeader' },
                                { text: 'Pokazivanje AMN (mm)', style: 'tableHeader' },
                                { text: 'Greška (mm)', style: 'tableHeader' },
                                { text: 'GDG (mm)', style: 'tableHeader' },
                                { text: 'T[ºC]', style: 'tableHeader' },
                                { text: 'rH[%]', style: 'tableHeader' },
                                { text: 'Provjera ispravnosti ugradnje', style: 'tableHeader' },
                                { text: 'Provjera natpisa i oznaka', style: 'tableHeader' },
                                { text: 'Provjera cjelovitosti i integriteta', style: 'tableHeader' },
                                { text: 'Rezultati inspekcije', style: 'tableHeader' },
                            ],
                            ...inspectionResults.map(result => [
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
                                result.installationCheck ? 'OK' : 'Nije OK',
                                result.labelCheck ? 'OK' : 'Nije OK',
                                result.integrityCheck ? 'OK' : 'Nije OK',
                                result.inspectionResult ? 'Zadovoljava' : 'Ne zadovoljava',
                            ]),
                        ],
                    },
                    layout: 'lightHorizontalLines', // koristi lagane horizontalne linije
                },
                // Napomena i potpisi
                {
                    text: '* Napomena: Ispunjavanje prvog uvjeta prilikom umjeravanja, da odstupanje mjerenja etalona mora biti unutar vrijednosti 1mm.',
                    style: 'note',
                    margin: [0, 10],
                },
                {
                    text: 'M.P.',
                    style: 'footer',
                    alignment: 'center',
                    margin: [0, 20],
                },
                {
                    table: {
                        widths: ['*', '*', '*'],
                        body: [
                            [
                                { text: 'Mjeritelj: <ime mjeritelja>', style: 'footer' },
                                { text: 'Tehnički rukovoditelj: Bruno', style: 'footer' },
                                { text: 'Broj stranice', style: 'footer', alignment: 'center' },
                            ],
                        ],
                    },
                    layout: 'noBorders',
                },
                {
                    text: 'Datum implementacije: 25.02.2022. Izdanje broj: 01 | Revizija broj: 04',
                    style: 'normal',
                    alignment: 'center',
                },
            ],
            footer: function(currentPage, pageCount) {
                return {
                    table: {
                        widths: ['25%', '55%', '20%'],
                        body: [
                            [
                                { text: 'Logo BATA', bold: true, rowSpan: 2, style: 'footerText', alignment: 'center' },
                                { text: 'Datum implementacije: 25.02.2022.', style: 'footerText', alignment: 'center' },
                                { text: 'Strana ' + currentPage + ' od ' + pageCount, alignment: 'right', rowSpan: 2, style: 'footerText', margin: [0, 20, 0, 0] }
                            ],
                            [
                                {}, // Prazna ćelija za prvi stupac
                                { text: 'Izdanje broj: 01 | Revizija broj: 04', style: 'footerText', alignment: 'center', marginBottom: 50 },
                                {}
                            ],
                        ],
                    },
                    layout: 'noBorders', // Postavi bez granica
                    margin: [40, 0], // Margine zaglavlja
                };
            },
            styles: {
                header: { fontSize: 14, bold: true, margin: [0, 10, 0, 10] },
                normal: { fontSize: 10, margin: [0, 5] },
                tableHeader: { fillColor: '#f3f3f3', bold: true, fontSize: 9, margin: [0, 5] },
                note: { fontSize: 9, italics: true, margin: [0, 10] },
                footer: { fontSize: 10, margin: [0, 20] },
                headerText: {
                    fontSize: 14,
                    bold: true,
                    alignment: 'center',
                    margin: [0, 10], // Razmak od 10 pikseli sa vrha i dna
                    // Opcionalno, dodajte padding ako je potrebno
                    // padding: [10, 0], // Razmak od 10 pikseli sa vrha i dna (samo za vizuelni efekat)
                },
                footerText: {
                    fontSize: 8,
                    bold: false,
                    margin: [0, 0], // Razmak od 10 pikseli sa vrha i dna
                    // Opcionalno, dodajte padding ako je potrebno
                    // padding: [10, 0], // Razmak od 10 pikseli sa vrha i dna (samo za vizuelni efekat)
                },
            },
        };
    
        pdfMake.createPdf(documentDefinition).download('izvjestaj.pdf');
    };
    

    return (
        <div className="p-4">
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
