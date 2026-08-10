/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, AlertCircle, CheckCircle, X, Car, ShieldCheck } from 'lucide-react';
import { Vehicle, Client } from '../types';
import { AppDatabase } from '../data/mockData';
import { checkVehicleWarrantyStatus } from '../utils/serviceOrderUtils';

interface VehiclesViewProps {
  db: AppDatabase;
  onSaveVehicles: (vehicles: Vehicle[]) => void;
  onAddHistoryLog: (type: 'budget' | 'service_order' | 'payment' | 'user_activity' | 'system', title: string, description: string, clientId: string, vehicleId: string) => void;
  setUnsavedTask: (task: {
    type: 'client' | 'vehicle' | 'budget' | 'os' | 'user' | null;
    saveCallback: () => void;
    discardCallback: () => void;
  } | null) => void;
}

export default function VehiclesView({ db, onSaveVehicles, onAddHistoryLog, setUnsavedTask }: VehiclesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Form Fields
  const [clientId, setClientId] = useState('');
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [color, setColor] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Auto-format Plate to ABC-1234 or Mercosul ABC1D23
  const formatPlate = (value: string) => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 7);
    if (cleaned.length <= 3) return cleaned;
    
    // Check if it's traditional ABC-1234
    // If the 5th character is a digit, we can treat it as traditional ABC-1234 and add the hyphen.
    // If we have Mercosul format, we can just leave it or format it cleanly. Let's make it standard:
    // Adding a hyphen after 3 letters if it matches traditional plate, else Mercosul ABC1D23 doesn't have hyphen.
    // To be safe for users, let's just format standard ABC-1234 or let Mercosul pass as ABC1D23.
    const letters = cleaned.slice(0, 3).replace(/[^A-Z]/g, '');
    const rest = cleaned.slice(3);
    
    // Check if the 2nd char in rest is a letter (Mercosul e.g., BRA5A26)
    const isMercosul = rest.length >= 2 && isNaN(Number(rest[1]));
    
    if (isMercosul) {
      return letters + rest;
    } else if (rest.length > 0) {
      return letters + '-' + rest;
    }
    return letters;
  };

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlate(formatPlate(e.target.value));
  };

  // Check dirty state
  const isFormDirty = clientId !== '' || plate.trim() !== '' || brand.trim() !== '' || model.trim() !== '' || color.trim() !== '';

  const resetForm = () => {
    setClientId('');
    setPlate('');
    setBrand('');
    setModel('');
    setYear(new Date().getFullYear());
    setColor('');
    setErrorMsg('');
    setEditingVehicle(null);
    setIsFormOpen(false);
    setUnsavedTask(null);
  };

  const openNewForm = () => {
    resetForm();
    if (db.clients.length > 0) {
      setClientId(db.clients[0].id);
    }
    setIsFormOpen(true);
  };

  const openEditForm = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setClientId(vehicle.clientId);
    setPlate(vehicle.plate);
    setBrand(vehicle.brand);
    setModel(vehicle.model);
    setYear(vehicle.year);
    setColor(vehicle.color);
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const executeSave = () => {
    if (!clientId || !plate.trim() || !brand.trim() || !model.trim()) {
      return { success: false, message: 'Todos os campos com * são obrigatórios.' };
    }

    if (plate.length < 7) {
      return { success: false, message: 'Placa inválida ou incompleta. Formatos aceitos: ABC-1234 ou ABC1D23.' };
    }

    // RN002: Placa única check
    const plateExists = db.vehicles.some(v => v.plate === plate && (!editingVehicle || v.id !== editingVehicle.id));
    if (plateExists) {
      return { success: false, message: 'Regra de Negócio Violada (RN002): Esta placa já está cadastrada para outro veículo.' };
    }

    let updatedVehiclesList: Vehicle[] = [];
    if (editingVehicle) {
      // Edit
      updatedVehiclesList = db.vehicles.map(v => 
        v.id === editingVehicle.id 
          ? { ...v, clientId, plate, brand, model, year, color } 
          : v
      );
      onSaveVehicles(updatedVehiclesList);
      onAddHistoryLog('user_activity', 'Veículo Editado', `Dados do veículo ${brand} ${model} (${plate}) atualizados.`, clientId, editingVehicle.id);
    } else {
      // Create
      const newVehicle: Vehicle = {
        id: `veh-${Date.now()}`,
        clientId,
        plate,
        brand,
        model,
        year,
        color,
        createdAt: new Date().toISOString()
      };
      updatedVehiclesList = [...db.vehicles, newVehicle];
      onSaveVehicles(updatedVehiclesList);
      onAddHistoryLog('system', 'Veículo Cadastrado', `Veículo ${brand} ${model} com placa ${plate} cadastrado e associado ao proprietário.`, clientId, newVehicle.id);
    }

    return { success: true, list: updatedVehiclesList };
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const res = executeSave();
    if (!res.success) {
      setErrorMsg(res.message || '');
      return;
    }
    setSuccessMsg(editingVehicle ? 'Veículo atualizado com sucesso!' : 'Veículo cadastrado e vinculado com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3000);
    resetForm();
  };

  // Report unsaved changes
  useEffect(() => {
    if (isFormOpen && isFormDirty) {
      setUnsavedTask({
        type: 'vehicle',
        saveCallback: () => {
          executeSave();
        },
        discardCallback: () => {
          resetForm();
        }
      });
    } else {
      setUnsavedTask(null);
    }
  }, [isFormOpen, clientId, plate, brand, model, year, color]);

  // Find client name by ID
  const getClientName = (cid: string) => {
    const client = db.clients.find(c => c.id === cid);
    return client ? client.name : 'Proprietário Desconhecido';
  };

  // Filter vehicles
  const filteredVehicles = db.vehicles.filter(v => {
    const clientName = getClientName(v.clientId).toLowerCase();
    const query = searchQuery.toLowerCase();
    return v.plate.toLowerCase().includes(query) ||
           v.model.toLowerCase().includes(query) ||
           v.brand.toLowerCase().includes(query) ||
           clientName.includes(query);
  });

  return (
    <div className="space-y-6 animate-fade-in" id="vehicles-view-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 font-display">Frota de Veículos</h1>
          <p className="text-sm text-slate-500">Cadastro e associação de veículos aos clientes da oficina (RF003).</p>
        </div>
        {!isFormOpen && (
          <button 
            id="btn-add-vehicle"
            onClick={openNewForm} 
            className="mt-4 sm:mt-0 flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
            disabled={db.clients.length === 0}
            title={db.clients.length === 0 ? 'Cadastre um cliente primeiro!' : ''}
          >
            <Plus className="w-4 h-4" /> Cadastrar Veículo
          </button>
        )}
      </div>

      {db.clients.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-100 text-amber-800 text-xs rounded-lg flex items-center gap-2" id="vehicle-no-clients-warning">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p><strong>Atenção:</strong> Você precisa cadastrar pelo menos um <strong>Cliente</strong> antes de poder cadastrar um veículo.</p>
        </div>
      )}

      {/* Notifications */}
      {successMsg && (
        <div id="vehicle-success-alert" className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-lg flex items-center gap-2 border border-emerald-100 animate-slide-up">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {/* Form */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-md animate-slide-up" id="vehicle-form-panel">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
            <h3 className="font-semibold text-slate-800 font-display text-base">
              {editingVehicle ? `Editar Veículo: ${editingVehicle.brand} ${editingVehicle.model}` : 'Novo Cadastro de Veículo'}
            </h3>
            <button 
              id="btn-close-vehicle-form"
              onClick={resetForm} 
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMsg && (
            <div id="vehicle-error-alert" className="mb-4 p-4 bg-rose-50 text-rose-800 text-xs rounded-lg flex items-center gap-2 border border-rose-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="font-medium">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4" id="form-vehicle">
            {/* Owner Dropdown */}
            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-600" htmlFor="vehicle-owner-select">Proprietário (Cliente) *</label>
              <select 
                id="vehicle-owner-select"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 transition bg-white"
                required
              >
                {db.clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} (CPF: {client.cpf})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="vehicle-plate-input">Placa * (RN002 - Única)</label>
              <input 
                id="vehicle-plate-input"
                type="text" 
                value={plate}
                onChange={handlePlateChange}
                placeholder="Ex: ABC-1234" 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 transition font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="vehicle-brand-input">Marca *</label>
              <input 
                id="vehicle-brand-input"
                type="text" 
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="Ex: Chevrolet, Honda, Ford" 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 transition"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="vehicle-model-input">Modelo *</label>
              <input 
                id="vehicle-model-input"
                type="text" 
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="Ex: Onix 1.0, Civic LX" 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 transition"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="vehicle-year-input">Ano Fabricação</label>
              <input 
                id="vehicle-year-input"
                type="number" 
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                min="1950" 
                max={new Date().getFullYear() + 2}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 transition"
              />
            </div>

            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-600" htmlFor="vehicle-color-input">Cor</label>
              <input 
                id="vehicle-color-input"
                type="text" 
                value={color}
                onChange={e => setColor(e.target.value)}
                placeholder="Ex: Prata, Preto Cristal, Branco" 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 transition"
              />
            </div>

            <div className="pt-2 flex gap-3 col-span-1 md:col-span-2">
              <button 
                id="btn-save-vehicle"
                type="submit" 
                className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition"
              >
                {editingVehicle ? 'Salvar Alterações' : 'Salvar Veículo'}
              </button>
              <button 
                id="btn-cancel-vehicle"
                type="button" 
                onClick={resetForm} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold px-5 py-2.5 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vehicles Table List */}
      {!isFormOpen && db.vehicles.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl shadow-xs overflow-hidden" id="vehicles-list-panel">
          {/* Table Search Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                id="vehicle-search-input"
                type="text" 
                placeholder="Buscar placa, modelo, marca ou cliente..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-sm pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="vehicles-table">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400 bg-slate-50/50">
                  <th className="p-4">Veículo</th>
                  <th className="p-4">Placa (Validação RN002)</th>
                  <th className="p-4">Proprietário</th>
                  <th className="p-4">Ano & Cor</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredVehicles.map(vehicle => (
                  <tr key={vehicle.id} className="hover:bg-slate-50/50 transition duration-150" id={`vehicle-row-${vehicle.id}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Car className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-slate-800">{vehicle.brand} {vehicle.model}</p>
                            {checkVehicleWarrantyStatus(vehicle.id, db.serviceOrders).hasActiveWarranty && (
                              <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1" title="Veículo possui serviços com garantia ativa">
                                <ShieldCheck className="w-3 h-3 text-emerald-700" /> Garantia
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">ID: {vehicle.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-md shadow-3xs uppercase">
                        {vehicle.plate}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-slate-700">{getClientName(vehicle.clientId)}</p>
                    </td>
                    <td className="p-4 text-slate-500">
                      <p>{vehicle.year}</p>
                      <p className="text-xs text-slate-400">{vehicle.color || 'Não informada'}</p>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        id={`btn-edit-vehicle-${vehicle.id}`}
                        onClick={() => openEditForm(vehicle)} 
                        className="text-indigo-600 hover:text-indigo-800 font-medium hover:bg-indigo-50 p-1.5 rounded-md transition inline-flex items-center gap-1 text-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
