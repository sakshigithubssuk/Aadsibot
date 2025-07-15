import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext'; // 👈 Import context
import './Payment.css';

const Payment = () => {
  const { user, token, setUser } = useContext(AuthContext); // 👈 Get user, token, and setUser
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePayment = async (plan, amount) => {
    setLoading(true);
    setStatus('⏳ Initializing payment...');

    try {
      // Step 1: Create an order on your backend
      const { data: orderData } = await axios.post(
        'http://localhost:5000/api/payment/create-order',
        { amount, plan },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Step 2: Configure Razorpay options
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: 'INR',
        name: 'ChatBot Pro',
        description: `Payment for ${plan === '1month' ? '1 Month Plan' : '3 Month Plan'}`,
        order_id: orderData.orderId,
        // Step 3: Define the handler function
        handler: async function (response) {
          setStatus('✅ Verifying payment...');
          try {
            // Step 4: Verify the payment on your backend
            const { data: verificationData } = await axios.post(
              'http://localhost:5000/api/payment/verify',
              {
                ...response, // sends razorpay_payment_id, etc.
                plan,
                amount
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update user in context with new credits
            setUser(verificationData.user);
            setStatus(`🎉 ${verificationData.message}`);
            setTimeout(() => navigate('/profile'), 2000);

          } catch (verifyError) {
            console.error(verifyError);
            setStatus(`❌ Verification failed: ${verifyError.response?.data?.message}`);
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.whatsappNumber,
        },
        theme: {
          color: '#6c63ff',
        },
      };

      // Step 5: Open the Razorpay modal
      const rzp = new window.Razorpay(options);
      rzp.open();
      
    } catch (error) {
      console.error(error);
      setStatus(`❌ Error: ${error.response?.data?.message || 'Could not initiate payment.'}`);
    } finally {
      setLoading(false);
    }
  };
 const handleManualCreditAdd = async (plan) => {
    setLoading(true);
    setStatus(`⏳ Manually adding credits for ${plan}...`);
    try {
      const { data } = await axios.post(
        'http://localhost:5000/api/payment/manual-test-add-credits',
        { plan }, // Send the plan name
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update the UI instantly with the new user data from the backend
      updateUser(data.user);
      setStatus(`✅ ${data.message}`);

    } catch (error) {
      console.error(error);
      setStatus(`❌ Manual add failed: ${error.response?.data?.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-container">
      <div className="payment-card">
        <h1 className="payment-title">💳 Upgrade Your Plan</h1>
        <p className="payment-subtitle">Choose a plan for unlimited access</p>
        <div className="payment-options">
          <button
            onClick={() => handlePayment('1month', 49)} // Pass plan and amount
            className="payment-button"
            disabled={loading}
          >
            1 Month Plan – ₹49
          </button>
          <button
            onClick={() => handlePayment('3month', 149)} // Pass plan and amount
            className="payment-button"
            disabled={loading}
          >
            3 Month Plan – ₹149
          </button>
        </div>
        {status && <p className="payment-status">{status}</p>}
        <Link to="/" className="back-button">
          ⬅ Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Payment;