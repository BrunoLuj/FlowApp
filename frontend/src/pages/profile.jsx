import React, { useState } from 'react';

const UserProfile = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    password: '',
    theme: 'light',
    address: '',
    bio: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitted data:', formData);
  };

  return (
    <div className="p-6 sm:ml-16  rounded-lg max-w-8xl mx-auto mt-14">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">Korisnički Profil</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ime */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="name">Ime</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>

        {/* E-mail */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="email">E-mail</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>

        {/* Broj telefona */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="phone">Broj telefona</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>

        {/* Rola korisnika */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="role">Rola</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="user">Korisnik</option>
            <option value="admin">Administrator</option>
            <option value="moderator">Moderator</option>
          </select>
        </div>

        {/* Lozinka */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="password">Lozinka</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>

        {/* Tema */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="theme">Tema</label>
          <select
            id="theme"
            name="theme"
            value={formData.theme}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="light">Svijetla</option>
            <option value="dark">Tamna</option>
          </select>
        </div>

        {/* Adresa */}
        <div className="mb-4 col-span-1 md:col-span-2">
          <label className="block text-gray-700 mb-2" htmlFor="address">Adresa</label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        {/* Biografija */}
        <div className="mb-4 col-span-1 md:col-span-2">
          <label className="block text-gray-700 mb-2" htmlFor="bio">Biografija</label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
            rows="3"
          />
        </div>

        {/* Dugme za spremanje */}
        <div className="col-span-1 md:col-span-3">
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-semibold py-2 rounded"
          >
            Spremi Promjene
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserProfile;
