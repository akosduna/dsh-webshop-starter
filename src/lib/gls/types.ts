export type GlsPickupPoint = {
  id: string;
  name?: string;
  type?: string;
  externalId?: string;
  contact?: {
    address?: string;
    city?: string;
    postalCode?: string;
    countryCode?: string;
  };
};

export type GlsAddress = {
  Name: string;
  Street: string;
  HouseNumber?: string;
  HouseNumberInfo?: string;
  City: string;
  ZipCode: string;
  CountryIsoCode: string;
  ContactName?: string;
  ContactPhone?: string;
  ContactEmail?: string;
};
