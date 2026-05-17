-- Seed data: 10 AI use cases across retail, healthcare,legal, logistics, manufacturing and finance.
-- Costs in USD. ROI figures are conservative industry benchmarks.
-- industry is TEXT[] — a use case can span multiple industries.

INSERT INTO use_cases (
    title, description, industry, category,
    implementation_complexity, time_to_value_months,
    cost_range_min, cost_range_max,
    roi_percent, roi_timeframe_months,
    prerequisites, tags,
    cost_source, roi_source
) VALUES

-- ── RETAIL ────────────────────────────────────────────────────────────────────

(
    'AI-Powered Demand Forecasting',
    'ML models predict product demand at SKU and store level, reducing overstock '
    'and stockouts. Ingests historical sales, weather, promotions, and external '
    'signals to produce 30/60/90-day forecasts.',
    ARRAY['retail'], 'operations', 'medium', 4,
    80000.00, 250000.00, 165.00, 18,
    ARRAY['2+ years of historical sales data', 'ERP or POS system with API access', 'Data engineering capability'],
    ARRAY['forecasting', 'inventory', 'supply-chain', 'mlops']
),

(
    'Personalised Product Recommendations',
    'Real-time recommendation engine surfaces relevant products for each shopper '
    'based on browsing history, purchase patterns, and collaborative filtering. '
    'Delivered via website widgets, email, and push notifications.',
    ARRAY['retail'], 'customer_experience', 'low', 3,
    45000.00, 140000.00, 280.00, 12,
    ARRAY['CDP or user event tracking in place', 'Minimum 50k active customers', 'E-commerce platform with recommendation API hooks'],
    ARRAY['personalisation', 'ecommerce', 'customer-lifetime-value', 'real-time']
),

(
    'Computer Vision for Shelf & Inventory Monitoring',
    'In-store cameras and CV models detect out-of-stock shelves, misplaced products, '
    'and planogram compliance in real time. Alerts routed to staff mobile devices, '
    'reducing shrinkage and improving on-shelf availability.',
    ARRAY['retail'], 'operations', 'high', 8,
    220000.00, 580000.00, 135.00, 24,
    ARRAY['Camera infrastructure or CapEx budget', 'Store WiFi bandwidth ≥100 Mbps', 'IT security sign-off for edge devices'],
    ARRAY['computer-vision', 'edge-ai', 'shrinkage', 'planogram']
),

(
    'AI Customer Service Agent',
    'Conversational AI handles tier-1 enquiries (order status, returns, FAQs) across '
    'chat, email, and voice. Escalates to human agents with full context, extending '
    'support coverage to 24/7.',
    ARRAY['retail', 'finance', 'healthcare'], 'customer_experience', 'low', 2,
    30000.00, 95000.00, 320.00, 12,
    ARRAY['CRM with customer history', 'Defined escalation workflow', 'Legal review of AI disclosure requirements'],
    ARRAY['conversational-ai', 'customer-service', 'automation', 'nlp']
),

-- ── HEALTHCARE ────────────────────────────────────────────────────────────────

(
    'Ambient Clinical Documentation (AI Scribing)',
    'AI listens to patient–clinician conversations and auto-generates structured '
    'clinical notes (SOAP format) directly into the EHR. Reduces documentation '
    'time by ~2 hours per clinician per day.',
    ARRAY['healthcare'], 'clinical_operations', 'high', 6,
    160000.00, 420000.00, 210.00, 18,
    ARRAY['EHR integration capability (HL7/FHIR)', 'HIPAA/GDPR compliance framework', 'Clinician change-management programme'],
    ARRAY['nlp', 'ehr', 'clinical-notes', 'burnout-reduction', 'hipaa']
),

(
    'Diagnostic Imaging AI Assistance',
    'Deep learning models trained on radiology images (X-ray, CT, MRI) flag anomalies '
    'and prioritise worklists, acting as a second reader. Improves diagnostic accuracy '
    'and reduces radiologist backlog.',
    ARRAY['healthcare'], 'diagnostics', 'high', 12,
    350000.00, 900000.00, 170.00, 24,
    ARRAY['DICOM-compliant imaging infrastructure', 'Regulatory clearance pathway (FDA 510k / CE Mark)', 'Radiologist training programme', 'IRB or ethics board approval'],
    ARRAY['computer-vision', 'radiology', 'diagnostics', 'deep-learning', 'fda']
),

(
    'Patient Readmission Risk Prediction',
    'Predictive model scores inpatients on 30-day readmission risk at discharge, '
    'enabling care teams to allocate post-discharge resources to high-risk patients '
    'and reduce avoidable readmissions.',
    ARRAY['healthcare'], 'care_management', 'medium', 5,
    95000.00, 280000.00, 185.00, 18,
    ARRAY['Structured EHR data with ≥3 years history', 'Data science team or partner', 'Clinical champion for model validation'],
    ARRAY['predictive-analytics', 'risk-stratification', 'ehr', 'care-management']
),

-- ── FINANCE ───────────────────────────────────────────────────────────────────

(
    'Real-Time Fraud Detection',
    'Ensemble ML models score every transaction at sub-100ms latency, flagging '
    'anomalies for review or auto-decline. Learns continuously from confirmed fraud '
    'and adapts to emerging attack patterns.',
    ARRAY['finance'], 'risk_management', 'high', 5,
    250000.00, 700000.00, 380.00, 12,
    ARRAY['Streaming data infrastructure (Kafka or equivalent)', 'Labelled fraud dataset (≥18 months)', 'Low-latency scoring API', 'Model risk management framework'],
    ARRAY['fraud', 'real-time', 'risk', 'mlops', 'compliance']
),

(
    'Automated Loan Underwriting',
    'AI-assisted underwriting platform analyses applicant data, credit bureau signals, '
    'and alternative data to generate instant credit decisions for standard applications, '
    'freeing underwriters to focus on complex cases.',
    ARRAY['finance'], 'lending', 'medium', 7,
    140000.00, 390000.00, 240.00, 18,
    ARRAY['Loan origination system with API', 'Model explainability requirement (ECOA/GDPR)', 'Fair lending audit process', 'Credit bureau data agreements'],
    ARRAY['credit', 'underwriting', 'explainability', 'automation', 'fair-lending']
),

(
    'AI-Powered Financial Planning Assistant',
    'Conversational AI helps retail banking customers analyse spending, set savings '
    'goals, and receive personalised product recommendations via open banking APIs.',
    ARRAY['finance'], 'customer_experience', 'medium', 6,
    180000.00, 480000.00, 195.00, 24,
    ARRAY['Open banking API access (PSD2 or equivalent)', 'Customer consent and data governance framework', 'Regulatory review (FCA / SEC)', 'Mobile app or web portal for delivery'],
    ARRAY['conversational-ai', 'open-banking', 'personalisation', 'wealth-management']
),

-- ── LOGISTICS ─────────────────────────────────────────────────────────────────

(
    'AI Route Optimisation',
    'ML models optimise last-mile and long-haul delivery routes in real time, '
    'accounting for traffic, weather, vehicle capacity, and time-window constraints. '
    'Reduces fuel consumption, improves on-time delivery rates, and cuts driver overtime.',
    ARRAY['logistics'], 'operations', 'medium', 4,
    70000.00, 220000.00, 190.00, 12,
    ARRAY['GPS-enabled fleet with telematics', 'Historical route and delivery data (≥12 months)', 'Integration with TMS or dispatch system'],
    ARRAY['route-optimisation', 'last-mile', 'fleet', 'real-time', 'fuel-reduction']
),

(
    'Predictive Fleet Maintenance',
    'IoT sensor data from vehicles is fed into ML models that predict component failures '
    'before they occur. Maintenance is scheduled proactively, reducing unplanned downtime, '
    'extending vehicle lifespan, and lowering emergency repair costs.',
    ARRAY['logistics'], 'operations', 'medium', 5,
    90000.00, 280000.00, 210.00, 18,
    ARRAY['Telematics or OBD sensors on fleet vehicles', 'Maintenance history data (≥2 years)', 'Workshop scheduling system with API access'],
    ARRAY['predictive-maintenance', 'iot', 'fleet', 'downtime-reduction', 'mlops']
),

(
    'Automated Invoice Processing',
    'Computer vision and NLP extract structured data from supplier invoices across formats '
    '(PDF, scan, EDI), match against purchase orders, flag discrepancies, and route for '
    'approval — reducing manual processing time by up to 80% and cutting error rates.',
    ARRAY['logistics', 'finance'], 'finance_operations', 'low', 2,
    35000.00, 110000.00, 300.00, 12,
    ARRAY['ERP or accounts payable system with API', 'Digital or scannable invoice workflow', 'Finance team sign-off on exception-handling rules'],
    ARRAY['document-ai', 'ocr', 'nlp', 'accounts-payable', 'automation']
),

(
    'Warehouse Demand Forecasting',
    'ML models predict inbound and outbound volume at SKU and warehouse level, enabling '
    'optimal labour scheduling, slotting, and replenishment planning. Reduces pick errors, '
    'overtime costs, and safety stock requirements.',
    ARRAY['logistics', 'retail'], 'operations', 'medium', 5,
    85000.00, 240000.00, 175.00, 18,
    ARRAY['WMS with historical order and inventory data (≥18 months)', 'SKU-level demand signal or ERP integration', 'Labour planning tool or scheduling system'],
    ARRAY['forecasting', 'warehouse', 'wms', 'labour-planning', 'inventory']
),

-- ── MANUFACTURING ─────────────────────────────────────────────────────────────

(
    'Visual Defect Detection',
    'Computer vision models inspect products on the production line in real time, '
    'detecting surface defects, dimensional anomalies, and assembly errors faster '
    'and more consistently than manual QC. Reduces scrap rates, rework costs, and '
    'warranty claims.',
    ARRAY['manufacturing'], 'quality_control', 'high', 6,
    150000.00, 400000.00, 220.00, 18,
    ARRAY['Camera and lighting infrastructure on production line', 'Labelled defect image dataset (≥5,000 samples per defect class)', 'MES or QC system integration', 'IT/OT network connectivity on factory floor'],
    ARRAY['computer-vision', 'quality-control', 'defect-detection', 'edge-ai', 'manufacturing']
),

(
    'Production Scheduling Optimisation',
    'ML and constraint-based optimisation models generate dynamic production schedules '
    'that balance machine capacity, material availability, workforce shifts, and order '
    'deadlines. Reduces changeover time, improves OEE, and cuts work-in-progress inventory.',
    ARRAY['manufacturing'], 'operations', 'medium', 5,
    100000.00, 300000.00, 180.00, 18,
    ARRAY['ERP or MES with real-time production data', 'Bill of materials and routing data', 'Planner buy-in for algorithm-driven scheduling'],
    ARRAY['optimisation', 'scheduling', 'oee', 'manufacturing', 'supply-chain']
),

(
    'Energy Consumption Optimisation',
    'ML models analyse sensor data from machinery, HVAC, and utilities to predict '
    'energy demand and recommend or automate adjustments. Identifies inefficient '
    'equipment and optimal shift scheduling to cut energy costs by 10–25%.',
    ARRAY['manufacturing'], 'sustainability', 'medium', 4,
    75000.00, 200000.00, 155.00, 12,
    ARRAY['Smart meters or IoT sensors on major energy consumers', 'At least 12 months of energy and production data', 'Building management or SCADA system with API'],
    ARRAY['energy', 'iot', 'sustainability', 'cost-reduction', 'manufacturing']
),

-- ── HR ────────────────────────────────────────────────────────────────────────

(
    'AI Candidate Screening & Shortlisting',
    'NLP models parse CVs, cover letters, and application responses to rank candidates '
    'against job requirements, flag skill gaps, and surface high-potential profiles that '
    'might otherwise be overlooked. Reduces time-to-shortlist by up to 70%.',
    ARRAY['hr'], 'talent_acquisition', 'low', 2,
    40000.00, 120000.00, 260.00, 12,
    ARRAY['ATS with API access', 'Structured job descriptions with defined competency requirements', 'Bias audit process and legal review (EU AI Act / EEOC compliance)'],
    ARRAY['nlp', 'recruitment', 'talent-acquisition', 'bias-mitigation', 'automation']
),

(
    'Employee Attrition Prediction',
    'Predictive model combines HR data (tenure, performance, compensation, engagement '
    'survey scores) to generate monthly attrition risk scores per employee. Enables HR '
    'to intervene early with targeted retention actions for high-risk, high-value staff.',
    ARRAY['hr'], 'people_analytics', 'medium', 5,
    65000.00, 190000.00, 195.00, 18,
    ARRAY['HRIS with structured employee records (≥2 years)', 'Engagement or pulse survey data', 'Data privacy and employee consent framework (GDPR)', 'HR business partner change-management programme'],
    ARRAY['predictive-analytics', 'retention', 'people-analytics', 'churn', 'hr']
),

-- ── LEGAL ─────────────────────────────────────────────────────────────────────

(
    'Contract Review & Risk Extraction',
    'LLM-powered contract analysis identifies non-standard clauses, missing provisions, '
    'unfavourable liability terms, and regulatory red flags across NDAs, MSAs, and '
    'supplier contracts. Cuts average review time from hours to minutes per document.',
    ARRAY['legal'], 'contract_management', 'medium', 3,
    80000.00, 250000.00, 275.00, 12,
    ARRAY['Contract repository or CLM system', 'Defined playbook of standard and acceptable clause variants', 'Legal team involvement for edge-case escalation workflow'],
    ARRAY['llm', 'contract-review', 'nlp', 'legal-tech', 'document-ai']
),

(
    'Legal Research & Precedent Discovery',
    'Semantic search and summarisation over case law, statutes, and regulatory guidance '
    'surfaces relevant precedents and synthesises key holdings in minutes rather than '
    'hours. Reduces associate research time and improves brief quality.',
    ARRAY['legal'], 'legal_research', 'low', 2,
    55000.00, 160000.00, 230.00, 12,
    ARRAY['Access to legal database (Westlaw, LexisNexis, or equivalent)', 'Defined research workflow for associate adoption', 'Data residency and confidentiality review'],
    ARRAY['rag', 'semantic-search', 'legal-research', 'llm', 'knowledge-management']
),

(
    'Regulatory Compliance Monitoring',
    'NLP pipelines continuously monitor regulatory feeds, official gazettes, and '
    'enforcement actions, extracting obligations relevant to the business and mapping '
    'them to internal policies. Flags gaps before regulators do.',
    ARRAY['legal', 'finance'], 'compliance', 'high', 8,
    120000.00, 350000.00, 190.00, 24,
    ARRAY['Structured list of applicable regulatory domains', 'Policy and control register with machine-readable format', 'Compliance team resource for triage and remediation'],
    ARRAY['compliance', 'nlp', 'regulatory', 'risk', 'legal-tech']
),

-- ── REAL ESTATE ───────────────────────────────────────────────────────────────

(
    'Automated Property Valuation (AVM)',
    'ML models combine transaction history, property attributes, macroeconomic signals, '
    'and local comparable sales to generate instant valuation estimates with confidence '
    'intervals. Accelerates underwriting, portfolio revaluation, and listing pricing.',
    ARRAY['real_estate', 'finance'], 'valuation', 'medium', 5,
    70000.00, 200000.00, 185.00, 12,
    ARRAY['Transaction dataset with ≥5 years of sales history', 'Structured property attribute data (size, type, age, condition)', 'Integration with valuation or underwriting workflow'],
    ARRAY['valuation', 'avm', 'real-estate', 'predictive-analytics', 'finance']
),

(
    'Tenant Churn Prediction & Retention',
    'Predictive models analyse lease tenure, payment history, maintenance request '
    'frequency, and engagement signals to score tenants on 90-day churn risk. '
    'Property managers can act proactively with renewal incentives before notice is given.',
    ARRAY['real_estate'], 'property_management', 'medium', 4,
    50000.00, 150000.00, 200.00, 18,
    ARRAY['Property management system with tenant history (≥2 years)', 'Structured lease and payment data', 'CRM or communication platform for retention outreach'],
    ARRAY['churn', 'retention', 'predictive-analytics', 'property-management', 'real-estate']
);
