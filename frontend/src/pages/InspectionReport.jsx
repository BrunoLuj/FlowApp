import React, { useEffect, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { getClient } from '../services/clientsServices';

pdfMake.vfs = pdfFonts.pdfMake.vfs; // Ovo omogućava pdfMake da koristi fontove

const InspectionReport = ({  inspectionResults, projectId, projectData }) => {

    const [client, setClient] = useState([]);

    useEffect(() => {
        const fetchClient = async () => {
            try {
                const response = await getClient(projectData.client_id);
                setClient(response.data);
            } catch (error) {
                console.error("Error fetching clients:", error);
            }
        };
        fetchClient();
    }, []);

    const generatePDF = () => {
        const documentDefinition = {
            pageSize: 'A4',
            pageOrientation: 'landscape',
            pageMargins: [40, 80, 40, 60],
            header: {
                table: {
                    widths: ['25%', '55%', '20%'],
                    body: [
                        [
                            {
                                image: client?.logo, // Insert the base64 logo here
                                width: 100, // Adjust the width of the logo as needed
                                height: 50, // Adjust the height of the logo as needed
                                rowSpan: 2,
                                alignment: 'center'
                            },
                            { text: 'Izvještaj o rezultatima inspekcije za automatska mjerila nivoa tečnosti - AMN', fontSize: 12, style: 'headerText', rowSpan: 2, margin:[0, 10] }, // Spajanje drugog stupca kroz dva reda
                            { text: 'Oznaka dokumenta : ', alignment: 'center', fontSize: 10} // Treći stupac
                        ],
                        [
                            {}, // Prazna ćelija za prvi stupac
                            {}, // Prazna ćelija za drugi stupac
                            { text: 'ZA -19.04/03', alignment: 'center', fontSize: 11, margin:[0, 10] } // Treći stupac
                        ],
                        // Novi red ispod
                        [
                            { text: 'Broj izvještaja : <broj>', bold: true, alignment: 'left', fontSize: 8,  border: [false, false, false, false] }, // Prvi stupac
                            { text: 'Osoba odgovorna za vođenje aktivnosti: Rukovoditelj IT', bold: true, alignment: 'right', fontSize: 8, colSpan: 2, border: [false, false, false, false]  }, // Treći stupac
                            {}, // Prazna ćelija za drugi stupac
                        ],
                    ],

                },
                // layout: 'noBorders', // Postavi bez granica
                margin: [40, 8, 40, 8], // Margine zaglavlja
            },
            content: [
                // Dodaj informacije o laboratoriji
                {
                    style: 'normal',
                    table: {
                        widths: ['25%','75%'],
                        body: [
                            [{ text: 'Imenovana laboratorija:', bold: true }, { text: 'IT Čaljkušić d.o.o.', alignment: 'center' }],
                            [{ text: 'Vlasnik/korisnik mjerila:', bold: true, margin: [0, 10, 0, 0] }, { text: '<kupac>', alignment: 'left', margin: [0, 10, 0, 0] }],
                            [{ text: 'Mjerilo predmet verifikacije:', bold: true }, { text: 'AMN', alignment: 'left' }],
                            [{ text: 'Službena oznaka:', bold: true }, { text: 'BA D-8-1009', alignment: 'left' }],
                            [{ text: 'Proizvođač:', bold: true }, { text: 'SEEBIT', alignment: 'left' }],
                            [{ text: 'Tip:', bold: true }, { text: 'SEETAC S200, SEETAC K200', alignment: 'left' }],
                            [{ text: 'Broj i datum zahtjeva inspekcije:', bold: true }, { text: '<broj>       <dpz>', alignment: 'left' }],
                            [{ text: 'Metode i procedure:', bold: true },{ text: 'Inspekcija automatskih mjerila nivoa tečnosti - AMN (RU-19.04.)', alignment: 'left' }],
                            [{ text: '', bold: true },{ text: 'Procedura za metode inspekcije (PR-19)', alignment: 'left' }],
                        ],
                    },
                    layout: {
                        hLineWidth: (i, node) => {
                            // Prvi red sa granicom
                            if (i === 1 || i === 9) return 1; // Horizontalne linije za prve 4 reda
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
                    margin: [0, 30], // Razmak iznad tabele
                },
                // Korišćena mjerna oprema
                {
                    style: 'normal',
                    table: {
                        widths: ['25%', '75%'],
                        body: [
                            [
                                { text: 'Korištena mjerna oprema:', bold: true,  margin: [5, 0], },
                                {
                                    ol: [
                                        'Mjerna letva/ALMIO/162-2019',
                                        'Mjerna letva/ALMIO/0116-2016',
                                        'Data Logger/MSR Electronic/410379',
                                        'Termometar stakleni/Tlos Zagreb/212-2017',
                                    ],
                                    margin: [0, 0, 0, 20], // Ukloni margine
                                }
                            ],
                        ],
                    },
                    layout: {
                        hLineWidth: (i, node) => {
                            // Prvi red sa granicom
                            if (i === 1) return 1; // Horizontalne linije za prve 4 reda
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
                    margin: [0, 0, 0, 40], // Razmak iznad tabele
                },
                // Rezultati mjerenja
                 // Dodaj informacije o laboratoriji
                 {
                    style: 'resultHeader',
                    table: {
                        widths: ['100%'],
                        body: [
                            [{ text: 'REZULTATI MJERENJA:', bold: true }],
                        ],
                    },
                    layout: {
                        hLineWidth: (i, node) => {
                            // Prvi red sa granicom
                            if (i === 1) return 1; // Horizontalne linije za prve 4 reda
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
                {
                    table: {
                        widths: ['6%', '9%', '8%', '8%', '*', '7%', '5%', '*', '*', '5%', '5%', '*', '*', '*', '*'],
                        body: [
                            // Glava tabele
                            [
                                { text: 'Proizvođač', style: 'tableHeader', fontSize: '7', alignment: 'center', margin: [0, 15] }, // Margin top i bottom
                                { text: 'Tip', style: 'tableHeader', fontSize: '7' , alignment: 'center' , margin: [0, 15] },
                                { text: 'Službena oznaka mjerila', style: 'tableHeader', fontSize: '7', alignment: 'center' ,},
                                { text: 'Serijski broj', style: 'tableHeader', fontSize: '7' , alignment: 'center' , margin: [0, 15]},
                                { text: 'Broj mjerenja', style: 'tableHeader', fontSize: '7', alignment: 'center',  },
                                { text: 'Pokazivanje etalona (mm)', style: 'tableHeader', fontSize: '7', alignment: 'center', },
                                { text: 'Pokazivanje AMN (mm)', style: 'tableHeader', fontSize: '7', alignment: 'center', },
                                { text: 'Greška (mm)', style: 'tableHeader', fontSize: '7', alignment: 'center', margin: [0, 15]  },
                                { text: 'GDG (mm)', style: 'tableHeader', fontSize: '7' , alignment: 'center', margin: [0, 15] },
                                { text: 'T[ºC]', style: 'tableHeader', fontSize: '7', alignment: 'center' , margin: [0, 15] },
                                { text: 'rH[%]', style: 'tableHeader', fontSize: '7' , alignment: 'center', margin: [0, 15] },
                                { text: 'Provjera ispravnosti ugradnje', style: 'tableHeader', fontSize: '7', alignment: 'center', },
                                { text: 'Provjera natpisa i oznaka', style: 'tableHeader', fontSize: '7', alignment: 'center', },
                                { text: 'Provjera cjelovitosti i integriteta', style: 'tableHeader', fontSize: '7' , alignment: 'center', },
                                { text: 'Rezultati inspekcije', style: 'tableHeader', fontSize: '7', alignment: 'center',  },
                            ],
                            // Redovi sa rezultatima
                            ...inspectionResults.flatMap(result => {
                                // Izlazni niz za sve redove
                                const rows = [];

                                // Proverimo da li imamo dovoljno rezultata
                                const measurementCount = Math.min(3, result.referenceResults.length, result.amnResults.length, result.errors.length);

                                // Dodavanje zajedničkih podataka samo jednom
                                const commonDataRow = [
                                    { text: result.manufacturer || '', rowSpan: measurementCount, margin: [0, 15] }, // Proizvođač
                                    { text: result.type || '', rowSpan: measurementCount, margin: [0, 8] }, // Tip
                                    { text: result.officialLabel || '', rowSpan: measurementCount, margin: [0, 15] }, // Službena oznaka
                                    { text: result.probe || '', rowSpan: measurementCount, margin: [0, 15] }, // Serijski broj
                                ];

                                // Iteriramo kroz rezultate i dodajemo ih u niz redova
                                for (let i = 0; i < measurementCount; i++) {
                                    if (i === 0) {
                                        // Prvi red dobija zajedničke podatke
                                        rows.push([...commonDataRow, i + 1,
                                            result.referenceResults[i] || '', // Pokazivanje etalona
                                            result.amnResults[i] || '', // Pokazivanje AMN
                                            result.errors[i] || '', // Greška
                                            '±4', // Max greška
                                            { text: result.temperature || '', rowSpan: measurementCount, margin: [0, 15] }, // T[ºC] sa rowSpan
                                            { text: result.humidity || '', rowSpan: measurementCount, margin: [0, 15] }, // rH[%] sa rowSpan
                                            { text: result.installationCheck ? 'DA' : 'NE', alignment: 'center', rowSpan: measurementCount, margin: [0, 15] }, // Provjera ispravnosti sa rowSpan
                                            { text: result.labelCheck ? 'DA' : 'NE', alignment: 'center', rowSpan: measurementCount, margin: [0, 15] }, // Provjera natpisa sa rowSpan
                                            { text: result.integrityCheck ? 'DA' : 'NE', alignment: 'center', rowSpan: measurementCount, margin: [0, 15] }, // Provjera integriteta sa rowSpan
                                            { text: result.inspectionResult ? 'DA' : 'NE', alignment: 'center', rowSpan: measurementCount, margin: [0, 15] } // Rezultati inspekcije sa rowSpan
                                        ]);
                                    } else {
                                        // Za sledeće redove dodajemo samo rezultate
                                        rows.push([
                                            '', // Proizvođač ostaje prazan
                                            '', // Tip ostaje prazan
                                            '', // Službena oznaka ostaje prazna
                                            '', // Serijski broj ostaje prazan
                                            i + 1, // Broj mjerenja
                                            result.referenceResults[i] || '', // Pokazivanje etalona
                                            result.amnResults[i] || '', // Pokazivanje AMN
                                            result.errors[i] || '', // Greška
                                            '±4', // Max greška
                                            '', // T[ºC] ostaje prazno
                                            '', // rH[%] ostaje prazno
                                            '', // Provjera ispravnosti ostaje prazna
                                            '', // Provjera natpisa ostaje prazna
                                            '', // Provjera integriteta ostaje prazna
                                            '' // Rezultati inspekcije ostaje prazno
                                        ]);
                                    }
                                }

                                return rows; // Vratimo sve redove
                            }),
                        ],
                    },
                    layout: 'lightHorizontalLines', // koristi lagane horizontalne linije
                    style: 'result',
                },

                // Napomena i potpisi
                {
                    text: '* Napomena: Ispunjavanje prvog uvjeta prilikom umjeravanja, da odstupanje mjerenja etalona mora biti unutar vrijednosti 1mm.',
                    style: 'note',
                    margin: [0, 10],
                },
                {
                    table: {
                        widths: ['15%', '30%', '25%', '30%'], // Širine stupaca
                        body: [
                            [
                                { text: 'Mjeritelj: ', style: 'footer', alignment: 'right', border: [false, false, false, false], margin: [0,0,0,0],  },
                                { text: ' <ime mjeritelja>', style: 'footer', alignment: 'center', border: [false, false, false, true], margin: [0,0,0,0]   },
                                { text: 'Tehnički rukovoditelj:', style: 'footer', alignment: 'right', border: [false, false, false, false], margin: [0,0,0,0]   }, // Prazna ćelija
                                { text: 'Bruno', style: 'footer', alignment: 'center', border: [false, false, false, true], margin: [0,0,0,0]  }  // Prazna ćelija
                            ],
                        ],
                    },
                    // layout: 'noBorders', // Bez granica između ćelija
                    margin: [40, 50] // Razmak oko tabele
                },
                {
                    text: 'M.P.',
                    style: 'footer',
                    alignment: 'center',
                    margin: [0, 20],
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
                normal: { fontSize: 11, margin: [0, 5] },
                tableHeader: { fillColor: '#f3f3f3', bold: true, fontSize: 9, margin: [0, 5] },
                note: { fontSize: 8, italics: true, margin: [0, 10] },
                footer: { fontSize: 10, margin: [0, 20] },
                headerText: {
                    bold: true,
                    alignment: 'center',
                    // margin: [0, 10], // Razmak od 10 pikseli sa vrha i dna
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
                result: {
                    fontSize: 8,
                    bold: false,
                    alignment: 'center',
                    border:[false, false, true, false]
                    // Opcionalno, dodajte padding ako je potrebno
                    // padding: [10, 0], // Razmak od 10 pikseli sa vrha i dna (samo za vizuelni efekat)
                },
                resultHeader: {
                    fontSize: 11,
                    bold: false,
                    alignment: 'center',
                    border:[false, false, true, false],
                    fillColor: '#f3f3f3',
                    // Opcionalno, dodajte padding ako je potrebno
                    // padding: [10, 0], // Razmak od 10 pikseli sa vrha i dna (samo za vizuelni efekat)
                },
                
            },
        };
    
        // console.log(JSON.stringify(documentDefinition, null, 2));
        pdfMake.createPdf(documentDefinition).download('izvjestaj.pdf');
    };
    

    return (
        <div className="p-4 relative">
            {/* <button onClick={handlePrint} className="mb-4 px-4 py-2 bg-blue-500 text-white rounded">
                Štampaj Izvještaj
            </button> */}
            {/* Fiksirani dugmadi na vrhu */}
            <div className="fixed top-14 left-0 right-0 p-4 z-10 shadow-md flex justify-between w-full bg-slate-800">
                <button onClick={generatePDF} className="px-4 py-2 bg-blue-500 text-white rounded-md shadow-md">
                    Spremi kao PDF
                </button>
                <button className="px-4 py-2 bg-green-500 text-white rounded-md shadow-md">Download</button>
                {/* Možete dodati druge dugmadi ovdje */}
                {/* <button onClick={handlePrint} className="px-4 py-2 bg-blue-500 text-white rounded">
                    Štampaj Izvještaj
                </button> */}
            </div>
             {/* Ostatak sadržaja */}
            <div className="mt-28">
                {/* Header */}
                <div className="flex justify-between mb-5 border-b-2 border-t-2 border-l-2 border-r-2 text-sm mt-16s">
                    <div className="flex-1 text-center border-r-2">
                        {/* Provjerite da client.logo sadrži base64 string */}
                        <img 
                            src={`${client?.logo}`} 
                            alt="Logo" 
                            className="h-20 mx-auto" 
                        />
                    </div>
                    <div className="flex-1 text-center border-r-2 pt-5"><strong>Izvještaj o rezultatima inspekcije za automatska mjerila nivoa  tečnosti - AMN</strong></div>
                    <div className="flex-1 text-center"><strong>Oznaka dokumenta : </strong>
                        <div className="flex-1 text-center border-t-2 pt-5"><strong>ZA -19.04/03</strong>
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
        </div>
    );
};

export default InspectionReport;
