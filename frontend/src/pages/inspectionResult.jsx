import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { saveAllInspectionsResults } from '../services/inspectionsServices';
import InspectionReport from './InspectionReport.jsx' ;

function InspectionResult() {
    const location = useLocation();
    const reportData = location.state?.reportData;

    console.log(reportData)

    const [inspectionResults, setInspectionResults] = useState([]);
    const [showReport, setShowReport] = useState(false);
    const [editIndex, setEditIndex] = useState(null);
    const [newResult, setNewResult] = useState({
        probe: '',
        manufacturer: '',
        type: '',
        officialLabel: '',
        referenceResults: ['', '', ''],
        amnResults: ['', '', ''],
        errors: ['', '', ''],
        maxAllowedError: 4,
        temperature: '',
        humidity: '',
        installationCheck: false,
        labelCheck: false,
        integrityCheck: false,
        inspectionResult: false,
    });

    const toggleReport = () => {
        setShowReport(!showReport);
    };

    const handleInputChange = (field, value) => {
        const updatedResult = { ...newResult, [field]: value };
        setNewResult(updatedResult);
    };

    const handleArrayChange = (index, field, value) => {
        const updatedArray = [...newResult[field]];
        updatedArray[index] = value;
        setNewResult({ ...newResult, [field]: updatedArray });
    };

    const handleCheckboxChange = (field) => {
        setNewResult((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    useEffect(() => {
        calculateErrors();
    }, [newResult.referenceResults, newResult.amnResults]);

    const calculateErrors = () => {
        const { referenceResults, amnResults } = newResult;
        
        // Izračunaj greške između etalona i AMN rezultata
        const newErrors = referenceResults.map((ref, index) => {
            const amnValue = amnResults[index];
            const error = Math.abs(parseFloat(ref) - parseFloat(amnValue));
            return isNaN(error) ? '' : error.toFixed(2);
        });
    
        // Provjera da li greške prelaze dozvoljenu granicu
        const maxAllowedError = 4; // Maksimalna dozvoljena greška
        const individualMaxError = 2; // Maksimalna dozvoljena greška za pojedinačna mjerenja
    
        const hasExceedsMaxError = newErrors.some(error => parseFloat(error) > maxAllowedError);
        const hasExceedsIndividualMaxError = newErrors.some(error => parseFloat(error) > individualMaxError);
    
        // Provjera razlika između AMN mjerenja
        const hasExceedsAMNDifference = amnResults.some((amnValue, index) => {
            if (index === 0) return false; // Prvo mjerenje nema prethodno za usporedbu
            const previousValue = parseFloat(amnResults[index - 1]);
            const currentValue = parseFloat(amnValue);
            return !isNaN(previousValue) && !isNaN(currentValue) && Math.abs(previousValue - currentValue) > individualMaxError;
        });
    
        // Ažuriraj stanje s greškama
        setNewResult(prevState => ({
            ...prevState,
            errors: newErrors,
            exceedsMaxError: hasExceedsMaxError,
            exceedsIndividualMaxError: hasExceedsIndividualMaxError,
            exceedsAMNDifference: hasExceedsAMNDifference,
        }));
    };

    useEffect(() => {
        const temperature = parseFloat(newResult.temperature);
        const humidity = parseFloat(newResult.humidity);
        const hasErrors = newResult.errors.some(error => error && parseFloat(error) > 4);
    
        const allConditionsMet = !hasErrors 
            && temperature >= 12 && temperature <= 30 
            && humidity >= 50 && humidity <= 90 
            && newResult.probe 
            && newResult.manufacturer 
            && newResult.type 
            && newResult.officialLabel 
            && newResult.referenceResults.every(result => result) 
            && newResult.amnResults.every(result => result)
            && newResult.installationCheck 
            && newResult.labelCheck 
            && newResult.integrityCheck; 
    
        // Only update the state if the value changes
        if (allConditionsMet !== newResult.inspectionResult) {
            setNewResult((prev) => ({
                ...prev,
                inspectionResult: allConditionsMet,
            }));
        }
    }, [
        newResult.temperature,
        newResult.humidity,
        newResult.errors,
        newResult.probe,
        newResult.manufacturer,
        newResult.type,
        newResult.officialLabel,
        newResult.referenceResults,
        newResult.amnResults,
        newResult.installationCheck,
        newResult.labelCheck,
        newResult.integrityCheck
    ]);
    
    const addResultToList = () => {

        if (!newResult.probe || !newResult.manufacturer || !newResult.type || !newResult.officialLabel ||
            newResult.referenceResults.some(result => !result) || 
            newResult.amnResults.some(result => !result)) {
            toast.error("Molimo ispunite sva polja prije dodavanja rezultata.");
            return;
        }

        calculateErrors(); // Izračunaj greške prije dodavanja rezultata

        const hasErrors = newResult.errors.some(error => error && parseFloat(error) > 4);
        const temperature = parseFloat(newResult.temperature);
        const humidity = parseFloat(newResult.humidity);

        if (hasErrors) {
            toast.error("Molimo ispravite greške prije dodavanja rezultata");
            return;
        }

        if (temperature < 12 || temperature > 30) {
            toast.error("Temperatura mora biti između 12 i 30 stupnjeva!");
            return;
        }

        if (humidity < 50 || humidity > 90) {
            toast.error("Vlažnost mora biti između 50% i 90%!");
            return;
        }

         // Provjerite da li su sve provjere na true
        const allChecksPassed = newResult.installationCheck && newResult.labelCheck && newResult.integrityCheck;

        // Ako su svi uvjeti zadovoljeni, automatski postavi inspekcijski rezultat na true
        const updatedResult = {
            ...newResult,
            inspectionResult: allChecksPassed,
        };

        if (editIndex !== null) {
            // If we're editing an existing result
            const updatedResults = [...inspectionResults];
            updatedResults[editIndex] = updatedResult;
            setInspectionResults(updatedResults);
            setEditIndex(null); // Reset edit index after updating
        } else {
            // If we're adding a new result
            setInspectionResults([...inspectionResults, updatedResult]);
        }

        resetNewResult();
    };

    const resetNewResult = () => {
        setNewResult({
            probe: '',
            manufacturer: '',
            type: '',
            officialLabel: '',
            referenceResults: ['', '', ''],
            amnResults: ['', '', ''],
            errors: ['', '', ''],
            maxAllowedError: 4,
            temperature: '',
            humidity: '',
            installationCheck: false,
            labelCheck: false,
            integrityCheck: false,
            inspectionResult: false,
        });
    };

    const editResult = (index) => {
        setEditIndex(index);
        setNewResult(inspectionResults[index]); // Populate the form with the selected result
    };

    const deleteResult = (index) => {
        const updatedResults = inspectionResults.filter((_, i) => i !== index);
        setInspectionResults(updatedResults);
    };

    const getErrorClass = (error, isAMNError = false) => {
        if (!error) return 'bg-gray-200'; // Neprikazivanje greške
        const errorValue = parseFloat(error);
        if (isAMNError) {
            return errorValue > 2 ? 'bg-red-200' : 'bg-green-200'; // Crveno za grešku, zeleno za ispravno
        }
        return errorValue <= 4 ? 'bg-green-200' : 'bg-red-200'; // Zeleni za ispravno, crveni za grešku
    };

    const saveAllResults = async () => {
        try {
            const projectId = reportData.id;
            for (const result of inspectionResults) {
                const resultWithProjectId = { ...result, projectId };
                console.log("Saving result:", resultWithProjectId);
                const response = await saveAllInspectionsResults(resultWithProjectId);
                console.log("Response:", response);

                if (!response.status === 201) {
                    console.error('Error details:', response.data); 
                    throw new Error('Failed to save result');
                }
            }

            // Clear the results after successful save
            setInspectionResults([]);

                toast.success("Svi rezultati su uspešno sačuvani!");
        } catch (error) {
            console.error('Error saving results:', error);
            toast.error("Došlo je do greške prilikom čuvanja rezultata.");
        }
    };    
    

    return (
        <div className="bg-gray-100 min-h-screen p-4 mt-14 sm:ml-16">
            <h1 className="text-3xl font-bold mb-4 text-center">Inspection System AMN for {reportData.name}</h1>

            <h3 className="text-lg font-semibold mb-2">Unos podataka o inspekciji</h3>
            <table className="min-w-full bg-white border border-gray-300 mb-6">
                <tbody>
                    <tr>
                        <td className="border px-4 py-2 font-semibold">Sonda koja se ispituje:</td>
                        <td className="border px-4 py-2">
                            <input 
                                type="text" 
                                value={newResult.probe} 
                                onChange={(e) => handleInputChange('probe', e.target.value)} 
                                className="border rounded w-full p-2" 
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="border px-4 py-2 font-semibold">Proizvođač:</td>
                        <td className="border px-4 py-2">
                            <input 
                                type="text" 
                                value={newResult.manufacturer} 
                                onChange={(e) => handleInputChange('manufacturer', e.target.value)} 
                                className="border rounded w-full p-2" 
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="border px-4 py-2 font-semibold">Tip:</td>
                        <td className="border px-4 py-2">
                            <input 
                                type="text" 
                                value={newResult.type} 
                                onChange={(e) => handleInputChange('type', e.target.value)} 
                                className="border rounded w-full p-2" 
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="border px-4 py-2 font-semibold">Službena oznaka:</td>
                        <td className="border px-4 py-2">
                            <input 
                                type="text" 
                                value={newResult.officialLabel} 
                                onChange={(e) => handleInputChange('officialLabel', e.target.value)} 
                                className="border rounded w-full p-2" 
                            />
                        </td>
                    </tr>
                </tbody>
            </table>

            <h3 className="text-lg font-semibold mb-2">Rezultati (3 mjerenja)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                    <h4 className="font-semibold">Etalon rezultati</h4>
                    {newResult.referenceResults.map((result, index) => (
                        <input 
                            key={`reference-${index}`} 
                            type="text" 
                            value={result} 
                            onChange={(e) => handleArrayChange(index, 'referenceResults', e.target.value)} 
                            className={`border rounded w-full p-2 mb-2 ${getErrorClass(newResult.errors[index])}`}
                            placeholder={`Etalon rezultat ${index + 1}`} 
                        />
                    ))}
                </div>
                <div>
                    <h4 className="font-semibold">AMN rezultati</h4>
                    {newResult.amnResults.map((result, index) => {
                        const amnError = Math.abs(parseFloat(result) - parseFloat(newResult.referenceResults[index]));
                        const isAMNError = index > 0 ? Math.abs(parseFloat(newResult.amnResults[index]) - parseFloat(newResult.amnResults[index - 1])) > 2 : false;
                        return (
                            <input 
                                key={`amn-${index}`} 
                                type="text" 
                                value={result} 
                                onChange={(e) => handleArrayChange(index, 'amnResults', e.target.value)} 
                                className={`border rounded w-full p-2 mb-2 ${getErrorClass(amnError.toFixed(2), isAMNError)}`}
                                placeholder={`AMN rezultat ${index + 1}`} 
                            />
                        );
                    })}
                </div>

                <div>
                    <h4 className="font-semibold">Greške</h4>
                    {newResult.errors.map((error, index) => {
                        const isAMNError = newResult.amnResults[index] && index > 0 
                            ? Math.abs(parseFloat(newResult.amnResults[index]) - parseFloat(newResult.amnResults[index - 1])) > 2 
                            : false;
                        return (
                            <input 
                                key={`error-${index}`} 
                                type="text" 
                                value={error} 
                                readOnly 
                                className={`border rounded w-full p-2 mb-2 ${getErrorClass(error, isAMNError)}`} 
                                placeholder={`Greška ${index + 1}`} 
                            />
                        );
                    })}
                </div>

            </div>

            <h3 className="text-lg font-semibold mb-2">Dodatni podaci</h3>
            <table className="min-w-full bg-white border border-gray-300 mb-6">
                <tbody>
                    <tr>
                        <td className="border px-4 py-2 font-semibold">Maks. greška dozvoljena:</td>
                        <td className="border px-4 py-2">± {newResult.maxAllowedError} mm</td>
                    </tr>
                    <tr>
                        <td className="border px-4 py-2 font-semibold">Temperatura:</td>
                        <td className="border px-4 py-2">
                            <input 
                                type="text" 
                                value={newResult.temperature} 
                                onChange={(e) => handleInputChange('temperature', e.target.value)} 
                                className={`border rounded w-full p-2 ${newResult.temperature < 12 || newResult.temperature > 30 ? 'bg-red-200' : 'bg-green-200'}`}  
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="border px-4 py-2 font-semibold">Vlažnost:</td>
                        <td className="border px-4 py-2">
                            <input 
                                type="text" 
                                value={newResult.humidity} 
                                onChange={(e) => handleInputChange('humidity', e.target.value)} 
                                className={`border rounded w-full p-2 ${newResult.humidity < 50 || newResult.humidity > 90 ? 'bg-red-200' : 'bg-green-200'}`}  
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="border px-4 py-2 font-semibold">Provjera ugradnje:</td>
                        <td className="border px-4 py-2">
                            <input 
                                type="checkbox" 
                                checked={newResult.installationCheck} 
                                onChange={() => handleCheckboxChange('installationCheck')} 
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="border px-4 py-2 font-semibold">Provjera natpisa i oznaka:</td>
                        <td className="border px-4 py-2">
                            <input 
                                type="checkbox" 
                                checked={newResult.labelCheck} 
                                onChange={() => handleCheckboxChange('labelCheck')} 
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="border px-4 py-2 font-semibold">Provjera cjelovitosti i integriteta:</td>
                        <td className="border px-4 py-2">
                            <input 
                                type="checkbox" 
                                checked={newResult.integrityCheck} 
                                onChange={() => handleCheckboxChange('integrityCheck')} 
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="border px-4 py-2 font-semibold">Rezultat inspekcije zadovoljava:</td>
                        <td className="border px-4 py-2">
                            <input 
                                type="checkbox" 
                                checked={newResult.inspectionResult} 
                                readOnly
                                className="cursor-not-allowed"
                            />
                        </td>
                    </tr>
                </tbody>
            </table>

            <button 
                onClick={addResultToList} 
                className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 mb-6 w-full"
            >
                Dodaj rezultat
            </button>

            <h3 className="text-lg font-semibold mt-6">Dodani rezultati</h3>
            <div className="overflow-x-auto">
                <table className="w-full bg-white border border-gray-300 mb-6">
                    <thead>
                        <tr>
                            <th className="border px-2 sm:px-4 py-2 text-left">Sonda</th>
                            <th className="border px-2 sm:px-4 py-2 text-left">Proizvođač</th>
                            <th className="border px-2 sm:px-4 py-2 text-left">Tip</th>
                            <th className="border px-2 sm:px-4 py-2 text-left">Službena oznaka</th>
                            <th className="border px-2 sm:px-4 py-2 text-left">Etalon Rezultati</th>
                            <th className="border px-2 sm:px-4 py-2 text-left">AMN Rezultati</th>
                            <th className="border px-2 sm:px-4 py-2 text-left">Temperatura</th>
                            <th className="border px-2 sm:px-4 py-2 text-left">Vlažnost</th>
                            <th className="border px-2 sm:px-4 py-2 text-left">Greške</th>
                            <th className="border px-2 sm:px-4 py-2 text-left">Provjera ugradnje</th>
                            <th className="border px-2 sm:px-4 py-2 text-left">Provjera natpisa i oznaka</th>
                            <th className="border px-2 sm:px-4 py-2 text-left">Provjera cjelovitosti i integriteta</th>
                            <th className="border px-2 sm:px-4 py-2 text-left">Rezultat inspekcije</th>
                            <th className="border px-2 sm:px-4 py-2 text-left">Akcije</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inspectionResults.map((result, index) => (
                            <tr key={index}>
                                <td className="border px-2 sm:px-4 py-2">{result.probe}</td>
                                <td className="border px-2 sm:px-4 py-2">{result.manufacturer}</td>
                                <td className="border px-2 sm:px-4 py-2">{result.type}</td>
                                <td className="border px-2 sm:px-4 py-2">{result.officialLabel}</td>
                                <td className="border px-2 sm:px-4 py-2">
                                    {result.referenceResults.join(', ')}
                                </td>
                                <td className="border px-2 sm:px-4 py-2">
                                    {result.amnResults.join(', ')}
                                </td>
                                <td className="border px-2 sm:px-4 py-2">{result.temperature}</td>
                                <td className="border px-2 sm:px-4 py-2">{result.humidity}</td>
                                <td className="border px-2 sm:px-4 py-2">
                                    <input 
                                        type="checkbox" 
                                        checked={result.installationCheck} 
                                        readOnly
                                        className="cursor-not-allowed"
                                    />
                                </td>
                                <td className="border px-2 sm:px-4 py-2">
                                    <input 
                                        type="checkbox" 
                                        checked={result.labelCheck} 
                                        readOnly
                                        className="cursor-not-allowed"
                                    />
                                </td>
                                <td className="border px-2 sm:px-4 py-2">
                                    <input 
                                        type="checkbox" 
                                        checked={result.integrityCheck} 
                                        readOnly
                                        className="cursor-not-allowed"
                                    />
                                </td>
                                <td className="border px-2 sm:px-4 py-2">
                                    <input 
                                        type="checkbox" 
                                        checked={result.inspectionResult} 
                                        readOnly
                                        className="cursor-not-allowed"
                                    />
                                </td>
                                <td className="border px-2 sm:px-4 py-2">
                                    <button 
                                        onClick={() => editResult(index)} 
                                        className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 mr-2"
                                    >
                                        Ažuriraj
                                    </button>
                                    <button 
                                        onClick={() => deleteResult(index)} 
                                        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                                    >
                                        Obriši
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>


            <button 
                onClick={() => saveAllResults()} 
                className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 mb-6 w-full"
            >
                Sačuvaj sve rezultate
            </button>

        {/* Dugme za otvaranje izveštaja */}
        <button 
            onClick={toggleReport} 
            className={`fixed right-0 top-1/2 transform -translate-y-1/2 rotate-90 bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 z-10 ${showReport ? 'hidden' : ''} mr-0`}
            style={{ marginRight: '-28px' }}
        >
            Izvještaj
        </button>

         {/* Dugme za zatvaranje izveštaja */}
         <button 
            onClick={toggleReport} 
            className={`fixed right-1/2 top-1/2 -translate-y-1/2 bg-red-500 text-white font-bold py-2 px-4 rounded-b hover:bg-red-600 transform rotate-90  ${showReport ? '' : 'hidden'}`}
            style={{ marginRight: '-22px' }}
        >
            Zatvori
        </button>


        {/* Kontejner za izveštaj */}
        <div 
            className={`fixed top-0 right-0 w-1/2 h-full bg-white shadow-lg transition-transform duration-300 ease-in-out ${showReport ? 'translate-x-0' : 'translate-x-full'} z-20 overflow-y-auto`}
        >
            <div className="p-4 relative">
                <h2 className="text-xl font-bold mb-4">Izvještaj</h2>
                <InspectionReport inspectionResults={inspectionResults} projectId={reportData.projectId} />
                
               
            </div>
        </div>
            

        </div>
    );
}

export default InspectionResult;
