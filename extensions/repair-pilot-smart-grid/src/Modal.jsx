import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

// Get the app URL - use production URL, will be overridden in development by Shopify CLI
const getAppUrl = () => {
  // In POS extensions, we can try to get the app URL from the environment
  // If not available, fall back to production URL
  if (typeof shopify !== 'undefined' && shopify?.environment?.appUrl) {
    return shopify.environment.appUrl;
  }
  // Production URL - this should match your shopify.app.toml application_url
  return 'https://repair-pilot.vercel.app';
};

const APP_URL = getAppUrl();

const createInitialNewCustomer = () => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
});

const createInitialDeviceInfo = () => ({
  type: '',
  brand: '',
  model: '',
  serial: '',
  issueDescription: '',
});

const createInitialFinancialInfo = () => ({
  quotedAmount: '',
  depositAmount: '',
});

// Custom Dropdown Component for POS Extensions
// Based on Shopify AI recommendations: Use primitives only, no s-choice-list
function Dropdown({ label, value, options, onChange, error, placeholder = "Select..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectedOption = options.find(opt => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;
  const displayTone = selectedOption ? 'base' : 'subdued';

  // Filter options based on search term
  const filteredOptions = searchTerm
    ? options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // Limit visible options for performance (show first 50)
  const MAX_VISIBLE_OPTIONS = 50;
  const visibleOptions = filteredOptions.slice(0, MAX_VISIBLE_OPTIONS);
  const hasMoreResults = filteredOptions.length > MAX_VISIBLE_OPTIONS;

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e) => {
      // Don't close if clicking inside the dropdown
      const dropdownElement = e.target.closest('s-box');
      if (!dropdownElement) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    // Use a small delay to avoid immediate close on open
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <s-stack direction="block" gap="tight">
      {label && <s-text type="strong">{label}</s-text>}
      <s-box position="relative">
        {/* Dropdown trigger button - styled like a select field */}
        <s-button
          variant={isOpen ? 'primary' : 'secondary'}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          fullWidth
        >
          <s-stack direction="inline" gap="base" alignment="spaceBetween">
            <s-text tone={displayTone} align="start">
              {displayText}
            </s-text>
            <s-text tone="subdued">{isOpen ? '▲' : '▼'}</s-text>
          </s-stack>
        </s-button>
        
        {/* Dropdown menu - appears below the button */}
        {isOpen && (
          <s-box
            background="base"
            borderWidth="base"
            border="base"
            cornerRadius="base"
            padding="none"
            marginTop="tight"
            position="absolute"
            style={{
              width: '100%',
              zIndex: 1000,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <s-stack direction="block" gap="none">
              {/* Search field for large lists */}
              {options.length > 10 && (
                <s-box padding="base" borderWidth="base" borderBottom="base">
                  <s-search-field
                    label="Search"
                    value={searchTerm}
                    onInput={(e) => {
                      // Real-time filtering as user types
                      const newValue = e.currentTarget?.value || e.target?.value || '';
                      setSearchTerm(newValue);
                    }}
                    placeholder="Type to search..."
                  />
                </s-box>
              )}
              
              {/* Scrollable options list - fixed height with scrollbar */}
              <s-scroll-box blockSize="250px" maxBlockSize="250px">
                <s-stack direction="block" gap="none">
                  {visibleOptions.length === 0 ? (
                    <s-box padding="base">
                      <s-text tone="subdued" align="center">No matches found</s-text>
                    </s-box>
                  ) : (
                    <>
                      {visibleOptions.map((option, index) => (
                        <s-box
                          key={option.value}
                          padding="base"
                          background={value === option.value ? 'highlight' : 'base'}
                          borderWidth={index > 0 ? 'base' : 'none'}
                          borderTop={index > 0 ? 'base' : 'none'}
                        >
                          <s-button
                            variant="plain"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(option.value);
                            }}
                            fullWidth
                          >
                            <s-text 
                              align="start" 
                              tone={value === option.value ? 'base' : 'base'}
                              type={value === option.value ? 'strong' : 'body'}
                            >
                              {option.label}
                            </s-text>
                          </s-button>
                        </s-box>
                      ))}
                      {hasMoreResults && (
                        <s-box padding="base" background="subdued">
                          <s-text tone="subdued" type="small" align="center">
                            Showing first {MAX_VISIBLE_OPTIONS} of {filteredOptions.length} results
                          </s-text>
                          <s-text tone="subdued" type="small" align="center">
                            Refine your search to see more
                          </s-text>
                        </s-box>
                      )}
                    </>
                  )}
                </s-stack>
              </s-scroll-box>
            </s-stack>
          </s-box>
        )}
      </s-box>
      {error && (
        <s-text tone="critical" type="small">{error}</s-text>
      )}
    </s-stack>
  );
}

function Modal() {
  // Customer state
  const [customerMode, setCustomerMode] = useState('search'); // 'search' or 'create'
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // New customer form
  const [newCustomer, setNewCustomer] = useState(createInitialNewCustomer);

  // Device state
  const [deviceInfo, setDeviceInfo] = useState(createInitialDeviceInfo);
  
  // Device lookup state
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedDeviceTypeId, setSelectedDeviceTypeId] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [deviceTypeOther, setDeviceTypeOther] = useState('');
  const [brandOther, setBrandOther] = useState('');
  const [modelOther, setModelOther] = useState('');
  const [loadingDeviceTypes, setLoadingDeviceTypes] = useState(true);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);

  // Financial state
  const [financialInfo, setFinancialInfo] = useState(createInitialFinancialInfo);

  // Payment handling
  const [paymentMode, setPaymentMode] = useState('pos'); // 'pos' or 'invoice'

  // Technician state
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [loadingTechnicians, setLoadingTechnicians] = useState(true);



  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [successInfo, setSuccessInfo] = useState(null);

  const close = async () => {
    let closed = false;

    try {
      if (!closed && shopify?.pos?.close) {
        console.log('Attempting shopify.pos.close');
        await shopify.pos.close();
        closed = true;
      }

      if (!closed && shopify?.navigation?.closeModal) {
        console.log('Attempting shopify.navigation.closeModal');
        await shopify.navigation.closeModal();
        closed = true;
      }

      if (!closed && shopify?.navigation?.dismissModal) {
        console.log('Attempting shopify.navigation.dismissModal');
        await shopify.navigation.dismissModal();
        closed = true;
      }

      if (!closed && shopify?.action?.closeModal) {
        console.log('Attempting shopify.action.closeModal');
        await shopify.action.closeModal();
        closed = true;
      }

      if (!closed && shopify?.action?.dismissModal) {
        console.log('Attempting shopify.action.dismissModal');
        await shopify.action.dismissModal();
        closed = true;
      }

      if (!closed && shopify?.actions?.Modal?.close) {
        console.log('Attempting shopify.actions.Modal.close');
        await shopify.actions.Modal.close();
        closed = true;
      }

      if (!closed && shopify?.modal?.close) {
        console.log('Attempting shopify.modal.close');
        await shopify.modal.close();
        closed = true;
      }

      if (!closed && shopify?.extension?.close) {
        console.log('Attempting shopify.extension.close');
        await shopify.extension.close();
        closed = true;
      }

      if (!closed && shopify?.extension?.modal?.close) {
        console.log('Attempting shopify.extension.modal.close');
        await shopify.extension.modal.close();
        closed = true;
      }

      if (!closed) {
        console.warn('No modal close API available on shopify object.');
        shopify?.toast?.show?.('Unable to close modal automatically. Please close it manually.', {
          isError: true,
        });
      }
    } catch (e) {
      console.error('closeModal failed', e);
      shopify?.toast?.show?.('Failed to close modal. Please close it manually.', { isError: true });
    }
  };

  const isCartNavigationSupported = async () => {
    try {
      if (shopify?.pos?.device) {
        const deviceInfo = await shopify.pos.device();
        console.log('POS device info:', deviceInfo);
        if (deviceInfo?.type && deviceInfo.type.toLowerCase() !== 'tablet') {
          return false;
        }
      }
    } catch (error) {
      console.warn('Failed to inspect POS device type:', error);
    }

    const cartApi = shopify?.pos?.cart || shopify?.cart;
    return Boolean(cartApi?.returnToCart);
  };

  const returnToPosCart = async () => {
    try {
      await close();
    } catch (error) {
      console.error('Failed to close modal before returning to POS cart:', error);
    }

    const canNavigate = await isCartNavigationSupported();

    if (!canNavigate) {
      console.warn('POS cart navigation is unavailable on this device.');
      shopify?.toast?.show?.('Please exit the modal to resume checkout. POS cart navigation is unavailable on this device.', {
        isError: false,
      });
      return;
    }

    try {
      const cartApi = shopify?.pos?.cart || shopify?.cart;
      console.log('Attempting cart.returnToCart');
      await cartApi.returnToCart();
    } catch (error) {
      console.error('Failed to return to POS cart:', error);
      shopify?.toast?.show?.('Unable to return to the POS cart automatically. Please close the modal manually.', {
        isError: true,
      });
    }
  };

  const resetForm = () => {
    setCustomerMode('search');
    setCustomerSearch('');
    setCustomers([]);
    setSelectedCustomer(null);
    setNewCustomer(createInitialNewCustomer());
    setDeviceInfo(createInitialDeviceInfo());
    setFinancialInfo(createInitialFinancialInfo());
    setSelectedTechnicianId('');
    setSelectedDeviceTypeId('');
    setSelectedBrandId('');
    setSelectedModelId('');
    setDeviceTypeOther('');
    setBrandOther('');
    setModelOther('');
    setModels([]);
    setErrors({});
    setPaymentMode('pos');
  };



  // Fetch technicians on mount
  useEffect(() => {
    const fetchTechnicians = async () => {
      setLoadingTechnicians(true);
      try {
        const response = await fetch(`${APP_URL}/api/technicians?activeOnly=true`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setTechnicians(data.technicians || []);
          
          // Show warning if scope is missing
          if (data.warning) {
            console.warn('Technician assignment:', data.warning);
          }
        }
      } catch (error) {
        console.error('Failed to load technicians:', error);
        // Don't show error toast as this is optional - technicians can be assigned later
      } finally {
        setLoadingTechnicians(false);
      }
    };

    fetchTechnicians();
  }, []);

  // Fetch device types on mount
  useEffect(() => {
    const fetchDeviceTypes = async () => {
      setLoadingDeviceTypes(true);
      try {
        const response = await fetch(`${APP_URL}/api/device-types`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        console.log('Device types response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Device types data:', data);
          if (data.success) {
            setDeviceTypes(data.deviceTypes || []);
            console.log('Loaded device types:', data.deviceTypes?.length || 0);
          } else {
            console.error('Device types API returned success=false:', data.error);
            shopify?.toast?.show?.(`Failed to load device types: ${data.error || 'Unknown error'}`, { isError: true });
          }
        } else {
          const errorText = await response.text();
          console.error('Device types API error:', response.status, errorText);
          shopify?.toast?.show?.(`Failed to load device types (${response.status})`, { isError: true });
        }
      } catch (error) {
        console.error('Failed to load device types:', error);
        shopify?.toast?.show?.(`Failed to load device types: ${error.message || 'Network error'}`, { isError: true });
      } finally {
        setLoadingDeviceTypes(false);
      }
    };

    fetchDeviceTypes();
  }, []);

  // Fetch brands on mount
  useEffect(() => {
    const fetchBrands = async () => {
      setLoadingBrands(true);
      try {
        const response = await fetch(`${APP_URL}/api/brands`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        console.log('Brands response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Brands data:', data);
          if (data.success) {
            setBrands(data.brands || []);
            console.log('Loaded brands:', data.brands?.length || 0);
          } else {
            console.error('Brands API returned success=false:', data.error);
            shopify?.toast?.show?.(`Failed to load brands: ${data.error || 'Unknown error'}`, { isError: true });
          }
        } else {
          const errorText = await response.text();
          console.error('Brands API error:', response.status, errorText);
          shopify?.toast?.show?.(`Failed to load brands (${response.status})`, { isError: true });
        }
      } catch (error) {
        console.error('Failed to load brands:', error);
        shopify?.toast?.show?.(`Failed to load brands: ${error.message || 'Network error'}`, { isError: true });
      } finally {
        setLoadingBrands(false);
      }
    };

    fetchBrands();
  }, []);

  // Fetch models when brand is selected
  useEffect(() => {
    if (!selectedBrandId) {
      setModels([]);
      setSelectedModelId('');
      return;
    }

    const fetchModels = async () => {
      setLoadingModels(true);
      try {
        const response = await fetch(`${APP_URL}/api/models?brandId=${selectedBrandId}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setModels(data.models || []);
          }
        }
      } catch (error) {
        console.error('Failed to load models:', error);
        shopify?.toast?.show?.('Failed to load models', { isError: true });
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, [selectedBrandId]);

  // Customer search with debouncing
  useEffect(() => {
    if (!customerSearch || customerSearch.length < 2) {
      setCustomers([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`${APP_URL}/api/tickets/search-customers`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: customerSearch })
        });
        
        if (response.ok) {
          const data = await response.json();
          setCustomers(data.customers || []);
        }
      } catch (error) {
        console.error('Customer search failed:', error);
        shopify?.toast?.show?.('Customer search failed', { isError: true });
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [customerSearch]);

  const validateForm = () => {
    const newErrors = {};

    // Customer validation
    if (customerMode === 'create') {
      if (!newCustomer.firstName.trim()) newErrors.firstName = 'First name is required';
      if (!newCustomer.lastName.trim()) newErrors.lastName = 'Last name is required';
    } else if (!selectedCustomer && !customerSearch.trim()) {
      newErrors.customer = 'Please search for a customer or create a new one';
    }

    // Device validation
    const selectedDeviceType = deviceTypes.find(dt => dt.id === selectedDeviceTypeId);
    if (!selectedDeviceTypeId) {
      newErrors.deviceType = 'Device type is required';
    } else if (selectedDeviceType?.name === 'Other' && !deviceTypeOther.trim()) {
      newErrors.deviceType = 'Please enter device type';
    }
    
    const selectedBrand = brands.find(b => b.id === selectedBrandId);
    if (!selectedBrandId) {
      newErrors.deviceBrand = 'Brand is required';
    } else if (selectedBrand?.name === 'Other' && !brandOther.trim()) {
      newErrors.deviceBrand = 'Please enter brand name';
    }
    
    if (!selectedBrandId) {
      newErrors.deviceModel = 'Please select a brand first';
    } else if (!selectedModelId) {
      newErrors.deviceModel = 'Model is required';
    } else if (selectedModelId === 'other' && !modelOther.trim()) {
      newErrors.deviceModel = 'Please enter model name';
    }

    // Financial validation
    if (!financialInfo.depositAmount || parseFloat(financialInfo.depositAmount) <= 0) {
      newErrors.depositAmount = 'Deposit amount is required and must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addDepositToPosCart = async ({
    ticketId,
    ticketSuffix,
    depositAmount,
  }) => {
    try {
      const cartApi = shopify?.cart || shopify?.pos?.cart;

      if (!cartApi?.addCustomSale) {
        return {
          success: false,
          error:
            'POS cart API is not available. Ensure this extension is running in the POS app (not Admin) and that the device is updated.',
        };
      }

      const amountNumber = parseFloat(depositAmount);
      if (!amountNumber || amountNumber <= 0) {
        return { success: false, error: 'Invalid deposit amount for POS cart.' };
      }

      const title = ticketSuffix
        ? `Repair Deposit - Ticket #${ticketSuffix}`
        : 'Repair Deposit';

      await cartApi.addCustomSale({
        title,
        price: amountNumber.toFixed(2),
        quantity: 1,
        taxable: false,
      });

      if (cartApi.addCartProperties) {
        await cartApi.addCartProperties({
          repairpilot_ticket_id: ticketId || '',
          repairpilot_payment_type: 'deposit',
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to add deposit to POS cart:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error adding item to cart',
      };
    }
  };

  const formatDepositAmount = (amount) => {
    const numeric = typeof amount === 'number' ? amount : parseFloat(amount || '0');
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return '0.00';
    }
    return numeric.toFixed(2);
  };

  


  const submit = async () => {
    console.log("Submit button clicked");
    
    if (!validateForm()) {
      shopify?.toast?.show?.('Please fix the form errors', { isError: true });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Attempting ticket creation...");
      console.log("App URL:", APP_URL);
      
      const ticketData = {
        // Customer data
        customerId: selectedCustomer?.id,
        createNewCustomer: customerMode === 'create' ? newCustomer : undefined,
        customerSearch: customerMode === 'search' && !selectedCustomer ? customerSearch : undefined,

        // Device data - use selected dropdown values or "Other" text values
        deviceType: selectedDeviceTypeId && deviceTypes.find(dt => dt.id === selectedDeviceTypeId)?.name !== 'Other'
          ? deviceTypes.find(dt => dt.id === selectedDeviceTypeId)?.name
          : deviceTypeOther.trim() || deviceInfo.type,
        deviceBrand: selectedBrandId && brands.find(b => b.id === selectedBrandId)?.name !== 'Other'
          ? brands.find(b => b.id === selectedBrandId)?.name
          : brandOther.trim() || deviceInfo.brand,
        deviceModel: selectedModelId && selectedModelId !== 'other'
          ? models.find(m => m.id === selectedModelId)?.name
          : modelOther.trim() || deviceInfo.model,
        serial: deviceInfo.serial,
        issueDescription: deviceInfo.issueDescription,

        // Financial data
        quotedAmount: parseFloat(financialInfo.quotedAmount) || 0,
        depositAmount: parseFloat(financialInfo.depositAmount),

        // Technician assignment
        technicianId: selectedTechnicianId || undefined,

        paymentMode,
      };

      console.log("Ticket data:", ticketData);
      
      // Try to get shop domain from POS environment if available
      let apiUrl = `${APP_URL}/api/tickets/create`;
      try {
        // In POS, we can get shop info from the environment
        if (typeof shopify !== 'undefined' && shopify?.environment?.store) {
          const shopDomain = shopify.environment.store;
          apiUrl = `${APP_URL}/api/tickets/create?shop=${encodeURIComponent(shopDomain)}`;
          console.log("Using shop domain from POS environment:", shopDomain);
        }
      } catch (e) {
        console.log("Could not get shop domain from POS environment:", e);
      }
      
      console.log("Making request to:", apiUrl);
      const response = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData)
      });

      console.log("Response received:", response.status, response.statusText);
      const result = await response.json();
      console.log("Response data:", result);

      if (result.success) {
        const ticketSuffix = result.ticketId ? result.ticketId.slice(-8) : '';
        const ticketMessage = ticketSuffix
          ? `Repair ticket created successfully. Ticket ID ending ${ticketSuffix}.`
          : 'Repair ticket created successfully.';
        let posCartStatus = null;
        if (paymentMode === 'pos') {
          posCartStatus = await addDepositToPosCart({
            ticketId: result.ticketId,
            ticketSuffix,
            depositAmount: result.depositAmount || financialInfo.depositAmount,
          });
        }

        const toastParts = [ticketMessage];

        if (paymentMode === 'invoice') {
          if (result.intakeInvoiceUrl) {
            toastParts.push('Deposit invoice created and sent to customer.');
          } else if (result.draftOrderId) {
            toastParts.push('Deposit draft order created for payment.');
          }
        } else if (posCartStatus?.success) {
          toastParts.push('Deposit added to the POS cart. Proceed to checkout to collect payment.');
        } else if (posCartStatus) {
          toastParts.push(
            `Ticket created. Add the deposit manually to the POS cart${
              posCartStatus.error ? ` (${posCartStatus.error}).` : '.'
            }`,
          );
        }

        shopify?.toast?.show?.(toastParts.join(' '));

        setSuccessInfo({
          ticketId: result.ticketId,
          ticketSuffix,
          intakeInvoiceUrl: result.intakeInvoiceUrl,
          draftOrderId: result.draftOrderId,
          paymentMode,
          depositAmount: result.depositAmount || parseFloat(financialInfo.depositAmount),
          posCartStatus,
        });
      } else {
        shopify?.toast?.show?.(result.error || 'Failed to create ticket', { isError: true });
      }
    } catch (error) {
      console.error('Ticket creation failed:', error);
      shopify?.toast?.show?.('Failed to create ticket', { isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAnother = () => {
    resetForm();
    setSuccessInfo(null);
  };

  if (successInfo) {
    if (successInfo.paymentMode === 'pos') {
      return (
        <s-screen heading="Repair Ticket Created">
          <s-scroll-box padding="large">
            <s-stack direction="block" gap="large">
              <s-stack direction="block" gap="tight">
                <s-text type="strong">Success!</s-text>
                <s-text>
                  The repair ticket has been created successfully
                  {successInfo.ticketSuffix ? ` (ID ending ${successInfo.ticketSuffix})` : ''}.
                </s-text>
                {successInfo.posCartStatus?.success ? (
                  <s-text>
                    The deposit has been added to the POS cart. Review the cart and complete the
                    payment using the POS checkout.
                  </s-text>
                ) : (
                  <s-text tone="critical">
                    We couldn't add the deposit to the POS cart automatically
                    {successInfo.posCartStatus?.error
                      ? ` (${successInfo.posCartStatus.error}).`
                      : '.'}{' '}
                    Add a custom sale in the cart for $
                    {formatDepositAmount(successInfo.depositAmount || financialInfo.depositAmount)} and
                    charge the customer.
                  </s-text>
                )}
              </s-stack>

              <s-stack direction="block" gap="base">
                <s-button variant="primary" onClick={returnToPosCart}>
                  Return to POS cart
                </s-button>
                <s-button variant="secondary" onClick={handleCreateAnother}>
                  Create another ticket
                </s-button>
              </s-stack>
            </s-stack>
          </s-scroll-box>
        </s-screen>
      );
    }

    return (
      <s-screen heading="Repair Ticket Created">
        <s-scroll-box padding="large">
          <s-stack direction="block" gap="large">
            <s-stack direction="block" gap="tight">
              <s-text type="strong">Success!</s-text>
              <s-text>
                The repair ticket has been created successfully
                {successInfo.ticketSuffix ? ` (ID ending ${successInfo.ticketSuffix})` : ''}.
              </s-text>
              {successInfo.intakeInvoiceUrl ? (
                <s-text>
                  The customer has been sent a payment link for the deposit. You can also view the
                  invoice in Shopify Admin.
                </s-text>
              ) : successInfo.draftOrderId ? (
                <s-text>
                  A draft order for the deposit was created. You can complete the payment in Shopify
                  Admin.
                </s-text>
              ) : null}
            </s-stack>

            <s-stack direction="block" gap="base">
              <s-button variant="primary" onClick={handleCreateAnother}>
                Create another ticket
              </s-button>
            </s-stack>
          </s-stack>
        </s-scroll-box>
      </s-screen>
    );
  }

  return (
    <s-screen heading="Create Repair Ticket">
      <s-scroll-box padding="large">
        {/* Customer Section */}
        <s-section heading="Customer Information">
          <s-stack direction="block" gap="base">
            {/* Mode Toggle */}
            <s-stack direction="inline" gap="tight">
              <s-button 
                variant={customerMode === 'search' ? 'primary' : 'secondary'}
                onClick={() => {
                  setCustomerMode('search');
                  setSelectedCustomer(null);
                  setCustomerSearch('');
                }}
              >
                Search Customer
              </s-button>
              <s-button 
                variant={customerMode === 'create' ? 'primary' : 'secondary'}
                onClick={() => {
                  setCustomerMode('create');
                  setSelectedCustomer(null);
                  setCustomerSearch('');
                }}
              >
                New Customer
              </s-button>
            </s-stack>

            {/* Search Mode */}
            {customerMode === 'search' ? (
              <s-stack direction="block" gap="base">
                <s-text-field
                  label="Search by name, email, or phone"
                  value={customerSearch}
                  onInput={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Enter name, email, or phone number"
                />
                
                {errors.customer && (
                  <s-text tone="critical">{errors.customer}</s-text>
                )}

                {isSearching && (
                  <s-box padding="base">
                    <s-text tone="subdued">Searching...</s-text>
                  </s-box>
                )}
                
                {/* Customer Results */}
                {customers.length > 0 && !selectedCustomer && (
                  <s-stack direction="block" gap="tight">
                    <s-text type="strong" tone="subdued">Select a customer:</s-text>
                    {customers.map((customer) => (
                      <s-box 
                        key={customer.id}
                        padding="base"
                        borderWidth="base"
                      >
                        <s-button
                          variant={selectedCustomer?.id === customer.id ? 'primary' : 'secondary'}
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          <s-stack direction="block" gap="none">
                            <s-text type="strong">{customer.displayName}</s-text>
                            {customer.email && (
                              <s-text type="small" tone="subdued">{customer.email}</s-text>
                            )}
                            {customer.phone && (
                              <s-text type="small" tone="subdued">{customer.phone}</s-text>
                            )}
                          </s-stack>
                        </s-button>
                      </s-box>
                    ))}
                  </s-stack>
                )}

                {/* Selected Customer Display */}
                {selectedCustomer && (
                  <s-box 
                    padding="base" 
                    borderWidth="base"
                  >
                    <s-stack direction="block" gap="tight">
                      <s-text type="strong">Selected Customer</s-text>
                      <s-text type="strong">{selectedCustomer.displayName}</s-text>
                      {selectedCustomer.email && (
                        <s-text type="small" tone="subdued">Email: {selectedCustomer.email}</s-text>
                      )}
                      {selectedCustomer.phone && (
                        <s-text type="small" tone="subdued">Phone: {selectedCustomer.phone}</s-text>
                      )}
                      <s-button
                        variant="secondary"
                        onClick={() => setSelectedCustomer(null)}
                      >
                        Change Customer
                      </s-button>
                    </s-stack>
                  </s-box>
                )}
              </s-stack>
            ) : (
              /* Create New Customer Mode */
              <s-stack direction="block" gap="base">
                <s-text-field
                  label="First Name"
                  value={newCustomer.firstName}
                  onInput={(e) => setNewCustomer({...newCustomer, firstName: e.target.value})}
                  placeholder="John"
                  error={errors.firstName}
                />
                <s-text-field
                  label="Last Name"
                  value={newCustomer.lastName}
                  onInput={(e) => setNewCustomer({...newCustomer, lastName: e.target.value})}
                  placeholder="Doe"
                  error={errors.lastName}
                />
                <s-text-field
                  label="Email"
                  value={newCustomer.email}
                  onInput={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  type="email"
                  placeholder="john@example.com"
                />
                <s-text-field
                  label="Phone"
                  value={newCustomer.phone}
                  onInput={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                />
              </s-stack>
            )}
          </s-stack>
        </s-section>

        {/* Device Section */}
        <s-section heading="Device Information">
          <s-stack direction="block" gap="base">
            {/* Device Type Dropdown */}
            {loadingDeviceTypes ? (
              <s-box padding="base">
                <s-text tone="subdued">Loading device types...</s-text>
              </s-box>
            ) : deviceTypes.length === 0 ? (
              <s-box padding="base">
                <s-text tone="critical">No device types available. Please check your connection.</s-text>
              </s-box>
            ) : (
              <s-stack direction="block" gap="tight">
                <Dropdown
                  label="Device Type"
                  value={selectedDeviceTypeId}
                  onChange={(value) => {
                    setSelectedDeviceTypeId(value);
                    const selectedType = deviceTypes.find(dt => dt.id === value);
                    if (selectedType?.name === 'Other') {
                      setDeviceTypeOther('');
                    } else {
                      setDeviceTypeOther('');
                      setDeviceInfo({...deviceInfo, type: selectedType?.name || ''});
                    }
                  }}
                  options={[
                    { value: '', label: 'Select Device Type' },
                    ...deviceTypes.map(dt => ({
                      value: dt.id,
                      label: dt.name
                    }))
                  ]}
                  error={errors.deviceType}
                  placeholder="Select Device Type"
                />
                {selectedDeviceTypeId && deviceTypes.find(dt => dt.id === selectedDeviceTypeId)?.name === 'Other' && (
                  <s-text-field
                    label="Device Type (Other)"
                    value={deviceTypeOther}
                    onInput={(e) => {
                      setDeviceTypeOther(e.target.value);
                      setDeviceInfo({...deviceInfo, type: e.target.value});
                    }}
                    placeholder="Enter device type"
                    error={errors.deviceType}
                  />
                )}
              </s-stack>
            )}

            {/* Brand Dropdown */}
            {loadingBrands ? (
              <s-box padding="base">
                <s-text tone="subdued">Loading brands...</s-text>
              </s-box>
            ) : brands.length === 0 ? (
              <s-box padding="base">
                <s-text tone="critical">No brands available. Please check your connection.</s-text>
              </s-box>
            ) : (
              <s-stack direction="block" gap="tight">
                <Dropdown
                  label="Brand"
                  value={selectedBrandId}
                  onChange={(value) => {
                    setSelectedBrandId(value);
                    const selectedBrand = brands.find(b => b.id === value);
                    if (selectedBrand?.name === 'Other') {
                      setBrandOther('');
                    } else {
                      setBrandOther('');
                      setDeviceInfo({...deviceInfo, brand: selectedBrand?.name || ''});
                    }
                    // Reset model when brand changes
                    setSelectedModelId('');
                    setModelOther('');
                    setModels([]);
                  }}
                  options={[
                    { value: '', label: 'Select Brand' },
                    ...brands.map(b => ({
                      value: b.id,
                      label: b.name
                    }))
                  ]}
                  error={errors.deviceBrand}
                  placeholder="Select Brand"
                />
                {selectedBrandId && brands.find(b => b.id === selectedBrandId)?.name === 'Other' && (
                  <s-text-field
                    label="Brand (Other)"
                    value={brandOther}
                    onInput={(e) => {
                      setBrandOther(e.target.value);
                      setDeviceInfo({...deviceInfo, brand: e.target.value});
                    }}
                    placeholder="Enter brand name"
                    error={errors.deviceBrand}
                  />
                )}
              </s-stack>
            )}

            {/* Model Dropdown */}
            {!selectedBrandId ? (
              <s-box padding="base">
                <s-text tone="subdued">Please select a brand first</s-text>
              </s-box>
            ) : loadingModels ? (
              <s-box padding="base">
                <s-text tone="subdued">Loading models...</s-text>
              </s-box>
            ) : (
              <s-stack direction="block" gap="tight">
                <Dropdown
                  label="Model"
                  value={selectedModelId}
                  onChange={(value) => {
                    setSelectedModelId(value);
                    const selectedModel = models.find(m => m.id === value);
                    if (selectedModel?.name === 'Other') {
                      setModelOther('');
                    } else {
                      setModelOther('');
                      setDeviceInfo({...deviceInfo, model: selectedModel?.name || ''});
                    }
                  }}
                  options={[
                    { value: '', label: 'Select Model' },
                    ...models.map(m => ({
                      value: m.id,
                      label: m.name
                    })),
                    { value: 'other', label: 'Other' }
                  ]}
                  error={errors.deviceModel}
                  placeholder="Select Model"
                />
                {selectedModelId === 'other' && (
                  <s-text-field
                    label="Model (Other)"
                    value={modelOther}
                    onInput={(e) => {
                      setModelOther(e.target.value);
                      setDeviceInfo({...deviceInfo, model: e.target.value});
                    }}
                    placeholder="Enter model name"
                    error={errors.deviceModel}
                  />
                )}
              </s-stack>
            )}

            <s-text-field
              label="Serial Number"
              value={deviceInfo.serial}
              onInput={(e) => setDeviceInfo({...deviceInfo, serial: e.target.value})}
              placeholder="Optional"
            />
            <s-text-area
              label="Issue Description"
              value={deviceInfo.issueDescription}
              onInput={(e) => setDeviceInfo({...deviceInfo, issueDescription: e.target.value})}
              placeholder="Describe the issue or repair needed..."
              rows={4}
            />
          </s-stack>
        </s-section>


        {/* Financial Section */}
        <s-section heading="Payment Information">
          <s-stack direction="block" gap="base">
            <s-stack direction="block" gap="tight">
              <s-text type="strong">Total Repair Cost (Quote)</s-text>
              <s-text type="small" tone="subdued">Enter the total estimated cost for this repair</s-text>
              <s-number-field
                value={financialInfo.quotedAmount}
                onInput={(e) => setFinancialInfo({...financialInfo, quotedAmount: e.target.value})}
                placeholder="150.00"
                inputMode="decimal"
                controls="stepper"
              />
            </s-stack>
            <s-stack direction="block" gap="tight">
              <s-text type="strong">Deposit Amount (Required)</s-text>
              <s-text type="small" tone="subdued">Amount customer pays upfront</s-text>
              <s-number-field
                value={financialInfo.depositAmount}
                onInput={(e) => setFinancialInfo({...financialInfo, depositAmount: e.target.value})}
                placeholder="50.00"
                error={errors.depositAmount}
                required
                inputMode="decimal"
                controls="stepper"
              />
            </s-stack>
            {financialInfo.quotedAmount && financialInfo.depositAmount && (
              <s-box background="highlight" padding="base" border="subdued" cornerRadius="medium">
                <s-stack direction="block" gap="none">
                  <s-text tone="subdued" type="small">
                    Summary
                  </s-text>
                </s-stack>
                <s-stack direction="block" gap="none">
                  <s-text type="small">Total Quote: ${parseFloat(financialInfo.quotedAmount || 0).toFixed(2)}</s-text>
                  <s-text type="small">Deposit Paid: ${parseFloat(financialInfo.depositAmount || 0).toFixed(2)}</s-text>
                  <s-text type="strong" tone="critical">
                    Remaining Balance: ${(parseFloat(financialInfo.quotedAmount || 0) - parseFloat(financialInfo.depositAmount || 0)).toFixed(2)}
                  </s-text>
                </s-stack>
              </s-box>
            )}

            <s-stack direction="block" gap="tight">
              <s-text type="strong">Payment Method</s-text>
              <s-stack direction="inline" gap="tight">
                <s-button
                  variant={paymentMode === 'pos' ? 'primary' : 'secondary'}
                  onClick={() => setPaymentMode('pos')}
                >
                  Collect in POS
                </s-button>
                <s-button
                  variant={paymentMode === 'invoice' ? 'primary' : 'secondary'}
                  onClick={() => setPaymentMode('invoice')}
                >
                  Send Invoice
                </s-button>
              </s-stack>
              <s-text tone="subdued" type="small">
                Collect in POS adds the deposit to the current cart so you can charge the customer right
                away. Send Invoice emails a draft order for later payment.
              </s-text>
            </s-stack>
          </s-stack>
        </s-section>

        {/* Technician Assignment Section */}
        <s-section heading="Assignment">
          <s-stack direction="block" gap="tight">
            {loadingTechnicians ? (
              <s-box padding="base">
                <s-text tone="subdued">Loading technicians...</s-text>
              </s-box>
            ) : technicians.length === 0 ? (
              <s-box padding="base">
                <s-text tone="subdued">
                  No technicians available. Assign in admin dashboard after ticket creation.
                </s-text>
              </s-box>
            ) : (
              <Dropdown
                label="Assign Technician"
                value={selectedTechnicianId}
                onChange={(value) => setSelectedTechnicianId(value)}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...technicians.map(tech => ({
                    value: tech.id,
                    label: tech.name
                  }))
                ]}
                placeholder="Unassigned"
              />
            )}
          </s-stack>
        </s-section>

        {/* Action Buttons */}
        <s-section>
          <s-stack direction="inline" gap="base">
            <s-button 
              variant="secondary" 
              onClick={close}
              disabled={isSubmitting}
            >
              Cancel
            </s-button>
            <s-button 
              variant="primary" 
              onClick={submit}
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              Create Ticket
            </s-button>
          </s-stack>
        </s-section>
      </s-scroll-box>
    </s-screen>
  );
}

export default () => {
  render(<Modal />, document.body);
};
