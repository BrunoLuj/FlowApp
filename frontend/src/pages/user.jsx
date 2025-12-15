import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useStore from '../store';
import { deleteUser, getRoles, getUsers, saveUser } from '../services/usersServices';
import { toast } from 'sonner';


const UserForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { permissions } = useStore();
  const countryCurrencyList = [
    { country: "Afghanistan", currency: "AFN" },
    { country: "Albania", currency: "ALL" },
    { country: "Algeria", currency: "DZD" },
    { country: "Andorra", currency: "EUR" },
    { country: "Angola", currency: "AOA" },
    { country: "Antigua and Barbuda", currency: "XCD" },
    { country: "Argentina", currency: "ARS" },
    { country: "Armenia", currency: "AMD" },
    { country: "Aruba", currency: "AWG" },
    { country: "Australia", currency: "AUD" },
    { country: "Austria", currency: "EUR" },
    { country: "Azerbaijan", currency: "AZN" },
    { country: "Bahamas", currency: "BSD" },
    { country: "Bahrain", currency: "BHD" },
    { country: "Bangladesh", currency: "BDT" },
    { country: "Barbados", currency: "BBD" },
    { country: "Belarus", currency: "BYN" },
    { country: "Belgium", currency: "EUR" },
    { country: "Belize", currency: "BZD" },
    { country: "Benin", currency: "XOF" },
    { country: "Bhutan", currency: "BTN" },
    { country: "Bolivia", currency: "BOB" },
    { country: "Bosnia and Herzegovina", currency: "BAM" },
    { country: "Botswana", currency: "BWP" },
    { country: "Brazil", currency: "BRL" },
    { country: "Brunei", currency: "BND" },
    { country: "Bulgaria", currency: "BGN" },
    { country: "Burkina Faso", currency: "XOF" },
    { country: "Burundi", currency: "BIF" },
    { country: "Cambodia", currency: "KHR" },
    { country: "Cameroon", currency: "XAF" },
    { country: "Canada", currency: "CAD" },
    { country: "Cape Verde", currency: "CVE" },
    { country: "Central African Republic", currency: "XAF" },
    { country: "Chad", currency: "XAF" },
    { country: "Chile", currency: "CLP" },
    { country: "China", currency: "CNY" },
    { country: "Colombia", currency: "COP" },
    { country: "Comoros", currency: "KMF" },
    { country: "Congo", currency: "XAF" },
    { country: "Costa Rica", currency: "CRC" },
    { country: "Croatia", currency: "HRK" },
    { country: "Cuba", currency: "CUP" },
    { country: "Cyprus", currency: "EUR" },
    { country: "Czech Republic", currency: "CZK" },
    { country: "Denmark", currency: "DKK" },
    { country: "Djibouti", currency: "DJF" },
    { country: "Dominica", currency: "XCD" },
    { country: "Dominican Republic", currency: "DOP" },
    { country: "Ecuador", currency: "USD" },
    { country: "Egypt", currency: "EGP" },
    { country: "El Salvador", currency: "USD" },
    { country: "Equatorial Guinea", currency: "XAF" },
    { country: "Eritrea", currency: "ERN" },
    { country: "Estonia", currency: "EUR" },
    { country: "Ethiopia", currency: "ETB" },
    { country: "Fiji", currency: "FJD" },
    { country: "Finland", currency: "EUR" },
    { country: "France", currency: "EUR" },
    { country: "Gabon", currency: "XAF" },
    { country: "Gambia", currency: "GMD" },
    { country: "Georgia", currency: "GEL" },
    { country: "Germany", currency: "EUR" },
    { country: "Ghana", currency: "GHS" },
    { country: "Greece", currency: "EUR" },
    { country: "Grenada", currency: "XCD" },
    { country: "Guatemala", currency: "GTQ" },
    { country: "Guinea", currency: "GNF" },
    { country: "Guyana", currency: "GYD" },
    { country: "Haiti", currency: "HTG" },
    { country: "Honduras", currency: "HNL" },
    { country: "Hungary", currency: "HUF" },
    { country: "Iceland", currency: "ISK" },
    { country: "India", currency: "INR" },
    { country: "Indonesia", currency: "IDR" },
    { country: "Iran", currency: "IRR" },
    { country: "Iraq", currency: "IQD" },
    { country: "Ireland", currency: "EUR" },
    { country: "Israel", currency: "ILS" },
    { country: "Italy", currency: "EUR" },
    { country: "Jamaica", currency: "JMD" },
    { country: "Japan", currency: "JPY" },
    { country: "Jordan", currency: "JOD" },
    { country: "Kazakhstan", currency: "KZT" },
    { country: "Kenya", currency: "KES" },
    { country: "Kiribati", currency: "AUD" },
    { country: "Kosovo", currency: "EUR" },
    { country: "Kuwait", currency: "KWD" },
    { country: "Kyrgyzstan", currency: "KGS" },
    { country: "Laos", currency: "LAK" },
    { country: "Latvia", currency: "EUR" },
    { country: "Lebanon", currency: "LBP" },
    { country: "Lesotho", currency: "LSL" },
    { country: "Liberia", currency: "LRD" },
    { country: "Libya", currency: "LYD" },
    { country: "Lithuania", currency: "EUR" },
    { country: "Luxembourg", currency: "EUR" },
    { country: "Madagascar", currency: "MGA" },
    { country: "Malawi", currency: "MWK" },
    { country: "Malaysia", currency: "MYR" },
    { country: "Maldives", currency: "MVR" },
    { country: "Mali", currency: "XOF" },
    { country: "Mauritania", currency: "MRU" },
    { country: "Mauritius", currency: "MUR" },
    { country: "Mexico", currency: "MXN" },
    { country: "Micronesia", currency: "USD" },
    { country: "Moldova", currency: "MDL" },
    { country: "Monaco", currency: "EUR" },
    { country: "Mongolia", currency: "MNT" },
    { country: "Morocco", currency: "MAD" },
    { country: "Mozambique", currency: "MZN" },
    { country: "Myanmar", currency: "MMK" },
    { country: "Namibia", currency: "NAD" },
    { country: "Nauru", currency: "AUD" },
    { country: "Nepal", currency: "NPR" },
    { country: "Netherlands", currency: "EUR" },
    { country: "New Zealand", currency: "NZD" },
    { country: "Nicaragua", currency: "NIO" },
    { country: "Niger", currency: "XOF" },
    { country: "Nigeria", currency: "NGN" },
    { country: "North Korea", currency: "KPW" },
    { country: "Norway", currency: "NOK" },
    { country: "Oman", currency: "OMR" },
    { country: "Pakistan", currency: "PKR" },
    { country: "Panama", currency: "PAB" },
    { country: "Papua New Guinea", currency: "PGK" },
    { country: "Paraguay", currency: "PYG" },
    { country: "Peru", currency: "PEN" },
    { country: "Philippines", currency: "PHP" },
    { country: "Poland", currency: "PLN" },
    { country: "Portugal", currency: "EUR" },
    { country: "Qatar", currency: "QAR" },
    { country: "Romania", currency: "RON" },
    { country: "Russia", currency: "RUB" },
    { country: "Rwanda", currency: "RWF" },
    { country: "Saint Kitts and Nevis", currency: "XCD" },
    { country: "Saint Lucia", currency: "XCD" },
    { country: "Samoa", currency: "WST" },
    { country: "San Marino", currency: "EUR" },
    { country: "Saudi Arabia", currency: "SAR" },
    { country: "Senegal", currency: "XOF" },
    { country: "Serbia", currency: "RSD" },
    { country: "Seychelles", currency: "SCR" },
    { country: "Sierra Leone", currency: "SLL" },
    { country: "Singapore", currency: "SGD" },
    { country: "Slovakia", currency: "EUR" },
    { country: "Slovenia", currency: "EUR" },
    { country: "Solomon Islands", currency: "SBD" },
    { country: "Somalia", currency: "SOS" },
    { country: "South Africa", currency: "ZAR" },
    { country: "South Korea", currency: "KRW" },
    { country: "South Sudan", currency: "SSP" },
    { country: "Spain", currency: "EUR" },
    { country: "Sri Lanka", currency: "LKR" },
    { country: "Sudan", currency: "SDG" },
    { country: "Suriname", currency: "SRD" },
    { country: "Sweden", currency: "SEK" },
    { country: "Switzerland", currency: "CHF" },
    { country: "Syria", currency: "SYP" },
    { country: "Taiwan", currency: "TWD" },
    { country: "Tajikistan", currency: "TJS" },
    { country: "Tanzania", currency: "TZS" },
    { country: "Thailand", currency: "THB" },
    { country: "Togo", currency: "XOF" },
    { country: "Tonga", currency: "TOP" },
    { country: "Trinidad and Tobago", currency: "TTD" },
    { country: "Tunisia", currency: "TND" },
    { country: "Turkey", currency: "TRY" },
    { country: "Uganda", currency: "UGX" },
    { country: "Ukraine", currency: "UAH" },
    { country: "United Arab Emirates", currency: "AED" },
    { country: "United Kingdom", currency: "GBP" },
    { country: "United States", currency: "USD" },
    { country: "Uruguay", currency: "UYU" },
    { country: "Uzbekistan", currency: "UZS" },
    { country: "Vanuatu", currency: "VUV" },
    { country: "Vatican City", currency: "EUR" },
    { country: "Venezuela", currency: "VES" },
    { country: "Vietnam", currency: "VND" },
    { country: "Yemen", currency: "YER" },
    { country: "Zambia", currency: "ZMW" },
    { country: "Zimbabwe", currency: "ZWL" },
    ];

  const user = location.state?.user || {};
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    id: user.id || null,
    firstname: user.firstname || '',
    lastname: user.lastname || '',
    email: user.email || '',
    address: user.address || '',
    contact: user.contact || '',
    country: user.country || '',
    currency: user.currency || '',
    roles_id: user.roles_id || '',
    status: user.status || false,
    description: user.description || '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const rolesResponse = await getRoles();
        setRoles(rolesResponse.data);
      } catch (err) {
        toast.error("Failed to load roles");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'status') {
      setFormData({ ...formData, [name]: value === 'Active' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveUser(formData);
      toast.success("User saved successfully!");
      navigate('/users');
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUser(user.id);
      toast.success("User deleted");
      navigate('/users');
    } catch {
      toast.error("Failed to delete user");
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="bg-gray-100 min-h-screen p-4 mt-14 sm:ml-16">
      <h2 className="text-3xl font-bold text-center mb-6">
        {user.id ? `${user.firstname} ${user.lastname}` : 'New User'}
      </h2>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Firstname */}
          <div>
            <label className="block text-gray-700 mb-2">First Name</label>
            <input
              type="text"
              name="firstname"
              value={formData.firstname}
              onChange={handleChange}
              readOnly={!permissions.includes('create_users')}
              className={`w-full border p-3 rounded-lg focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`}
            />
          </div>

          {/* Lastname */}
          <div>
            <label className="block text-gray-700 mb-2">Last Name</label>
            <input
              type="text"
              name="lastname"
              value={formData.lastname}
              onChange={handleChange}
              readOnly={!permissions.includes('create_users')}
              className={`w-full border p-3 rounded-lg focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-700 mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              readOnly={!permissions.includes('create_users')}
              className={`w-full border p-3 rounded-lg focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`}
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-gray-700 mb-2">Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              readOnly={!permissions.includes('create_users')}
              className={`w-full border p-3 rounded-lg focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`}
            />
          </div>

          {/* Contact */}
          <div>
            <label className="block text-gray-700 mb-2">Phone</label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              readOnly={!permissions.includes('create_users')}
              className={`w-full border p-3 rounded-lg focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`}
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-gray-700 mb-2">Role</label>
            <select
              name="roles_id"
              value={formData.roles_id}
              onChange={handleChange}
              disabled={!permissions.includes('create_users')}
              className={`w-full border p-3 rounded-lg focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`}
            >
              <option value="" disabled>Select role</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-gray-700 mb-2">Status</label>
            <select
              name="status"
              value={formData.status ? 'Active' : 'Inactive'}
              onChange={handleChange}
              disabled={!permissions.includes('create_users')}
              className={`w-full border p-3 rounded-lg focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Country */}
        <select
            name="country"
            value={formData.country}
            onChange={(e) => {
                const selected = countryCurrencyList.find(c => c.country === e.target.value);
                setFormData({
                ...formData,
                country: selected.country,
                currency: selected.currency
                });
            }}
            disabled={!permissions.includes('create_users')}
            className={`w-full border p-3 rounded-lg focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`}
            >
            <option value="">Select country</option>
            {countryCurrencyList.map((c) => (
                <option key={c.country} value={c.country}>{c.country}</option>
            ))}
        </select>


          {/* Currency */}
          <div>
            <label className="block text-gray-700 mb-2">Currency</label>
            <input
              type="text"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              readOnly={!permissions.includes('create_users')}
              className={`w-full border p-3 rounded-lg focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`}
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              readOnly={!permissions.includes('create_users')}
              className={`w-full border p-3 rounded-lg focus:ring focus:ring-blue-300 ${!permissions.includes('create_users') ? 'bg-gray-200' : ''}`}
              rows="4"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between mt-6 gap-2">
          {permissions.includes('update_users') && (
            <button type="submit" className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition">
              Save
            </button>
          )}
          {permissions.includes('delete_users') && user.id && (
            <button type="button" onClick={handleRemove} className="bg-red-600 text-white px-5 py-3 rounded-lg hover:bg-red-700 transition">
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default UserForm;
