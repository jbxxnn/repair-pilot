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

  // Financial state
  const [financialInfo, setFinancialInfo] = useState(createInitialFinancialInfo);

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
      if (shopify?.navigation?.closeModal) {
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

  const resetForm = () => {
    setCustomerMode('search');
    setCustomerSearch('');
    setCustomers([]);
    setSelectedCustomer(null);
    setNewCustomer(createInitialNewCustomer());
    setDeviceInfo(createInitialDeviceInfo());
    setFinancialInfo(createInitialFinancialInfo());
    setSelectedTechnicianId('');
    setErrors({});
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
    if (!deviceInfo.type.trim()) newErrors.deviceType = 'Device type is required';
    if (!deviceInfo.brand.trim()) newErrors.deviceBrand = 'Brand is required';
    if (!deviceInfo.model.trim()) newErrors.deviceModel = 'Model is required';

    // Financial validation
    if (!financialInfo.depositAmount || parseFloat(financialInfo.depositAmount) <= 0) {
      newErrors.depositAmount = 'Deposit amount is required and must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

        // Device data
        deviceType: deviceInfo.type,
        deviceBrand: deviceInfo.brand,
        deviceModel: deviceInfo.model,
        serial: deviceInfo.serial,
        issueDescription: deviceInfo.issueDescription,

        // Financial data
        quotedAmount: parseFloat(financialInfo.quotedAmount) || 0,
        depositAmount: parseFloat(financialInfo.depositAmount),

        // Technician assignment
        technicianId: selectedTechnicianId || undefined
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
        const toastParts = [ticketMessage];

        if (result.intakeInvoiceUrl) {
          toastParts.push('Deposit invoice created and sent to customer.');
        } else if (result.draftOrderId) {
          toastParts.push('Deposit draft order created for payment.');
        }

        shopify?.toast?.show?.(toastParts.join(' '));

        setSuccessInfo({
          ticketId: result.ticketId,
          ticketSuffix,
          intakeInvoiceUrl: result.intakeInvoiceUrl,
          draftOrderId: result.draftOrderId,
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

  const handleCloseTile = async () => {
    await close();
  };

  if (successInfo) {
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
              <s-button variant="secondary" onClick={handleCloseTile}>
                Close
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
            <s-text-field
              label="Device Type"
              value={deviceInfo.type}
              onInput={(e) => setDeviceInfo({...deviceInfo, type: e.target.value})}
              placeholder="Phone, Tablet, Laptop"
              error={errors.deviceType}
            />
            <s-text-field
              label="Brand"
              value={deviceInfo.brand}
              onInput={(e) => setDeviceInfo({...deviceInfo, brand: e.target.value})}
              placeholder="Apple, Samsung, Dell"
              error={errors.deviceBrand}
            />
            <s-text-field
              label="Model"
              value={deviceInfo.model}
              onInput={(e) => setDeviceInfo({...deviceInfo, model: e.target.value})}
              placeholder="iPhone 14, Galaxy S23"
              error={errors.deviceModel}
            />
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
              <s-box padding="base" borderWidth="base">
                <s-stack direction="block" gap="tight">
                  <s-text type="strong">Payment Summary</s-text>
                  <s-stack direction="block" gap="none">
                    <s-text type="small">Total Quote: ${parseFloat(financialInfo.quotedAmount || 0).toFixed(2)}</s-text>
                    <s-text type="small">Deposit Paid: ${parseFloat(financialInfo.depositAmount || 0).toFixed(2)}</s-text>
                    <s-text type="strong" tone="critical">
                      Remaining Balance: ${(parseFloat(financialInfo.quotedAmount || 0) - parseFloat(financialInfo.depositAmount || 0)).toFixed(2)}
                    </s-text>
                  </s-stack>
                </s-stack>
              </s-box>
            )}
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
              <s-select
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
