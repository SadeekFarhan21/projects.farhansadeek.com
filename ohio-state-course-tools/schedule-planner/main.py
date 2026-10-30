import streamlit as st
import requests
from datetime import datetime
import os
from dotenv import load_dotenv

def construct_url(subject, term):
    load_dotenv()
    base_url = os.getenv("host")
    return f"{base_url}{subject}/{term}.txt"

def main():
    st.title("Ohio State Schedule Planner")

    url = os.getenv("host")

    st.write("Available subjects:")
    subjects = [
    "ACADAFF", "ACCAD", "ACCTMIS", "ACEL", "AEDECON", "AEE", "AEROENG", "AFAMAST", "AGRCOMM", "AGSYSMGT",
    "AGSYSMT", "AIRSCI", "ALLIMED", "ANATOMY", "ANESTHES", "ANIMSCI", "ANMLTEC", "ANTHROP", "ARABIC", "ARCH",
    "ART", "ARTEDUC", "ARTSCOL", "ARTSSCI", "ASE", "ASL", "ASTRON", "ATHTRNG", "ATMOSSC", "AVIATION",
    "AVIATN", "BCS", "BIOCHEM", "BIOCHEMP", "BIOETHC", "BIOLOGY", "BIOMEDE", "BIOMINF", "BIOMSCI", "BIOPHRM",
    "BIOPHYS", "BIOSCI", "BIOSTAT", "BIOTECH", "BIOWMGT", "BMEA", "BMI", "BSGP", "BUSADM", "BUSFIN",
    "BUSMGT", "BUSMHR", "BUSML", "BUSOBA", "BUSTEC", "CATALAN", "CBE", "CBG", "CHBE", "CHEM",
    "CHEMPHY", "CHINESE", "CIRTECH", "CIVILEN", "CLAS", "CLASSICS", "CLLC", "COMLDR", "COMM", "COMPSTD",
    "CONSCI", "CONSYSM", "CONSYSMT", "CRPLAN", "CRPSOIL", "CSCFFS", "CSCFMFNS", "CSE", "CSFMRSM", "CSFRST",
    "CSFSNRTS", "CSHSPMG", "CSTW", "CSTXTCL", "CZECH", "DANCE", "DENT", "DENTHYG", "DESIGN", "DNE",
    "DSABLST", "EALL", "EARTHSC", "EARTHSCI", "ECE", "ECON", "EDUCST", "EDUPAES", "EDUPL", "EDUTL",
    "EEOB", "EEURLL", "EHE", "EMERGMED", "ENGINEER", "ENGLISH", "ENGR", "ENGRAPH", "ENGREDU", "ENGRTEC",
    "ENGTECH", "ENR", "ENTMLGY", "ENTOMOL", "ENVENG", "ENVSCI", "ENVSCT", "ESCE", "ESCFE", "ESEADM",
    "ESEPHL", "ESEPOL", "ESEPSY", "ESETEC", "ESHESA", "ESLTECH", "ESPHE", "ESQREM", "ESQUAL", "ESSPED",
    "ESSPSY", "ESTEPL", "ESWDE", "EXP", "EXPLORNG", "FABENG", "FAES", "FCSED", "FDSCTE", "FILMSTD",
    "FMRESM", "FRENCH", "FRIT", "GENBIOL", "GENCHEM", "GENCOMM", "GENED", "GENHUM", "GENMATH", "GENSSC",
    "GENSTDS", "GEODSCIE", "GEODSCIM", "GEOG", "GEORGIAN", "GEOSCIM", "GERMAN", "GRADSCH", "GRADTDA", "GREEK",
    "HCINNOV", "HCS", "HDFS", "HEBREW", "HECCREG", "HIMS", "HINDI", "HISTART", "HISTORY", "HONORS",
    "HORTTEC", "HOSPMGT", "HSMP", "HTHRHSC", "HUMANEC", "HUMCOL", "HUMNNTR", "HUNGARIN", "HUNGRN", "HW",
    "HWIH", "IBGP", "INDENG", "INTMED", "INTSTDS", "ISE", "ISLAM", "ITALIAN", "JAPANESE", "JAPANSE",
    "JEWSHST", "KINESIO", "KNHES", "KNOW", "KNPE", "KNSFHP", "KNSISM", "KOREAN", "LABBIOSC", "LARCH",
    "LATIN", "LAW", "LING", "LINGUIST", "MATH", "MATSCEN", "MBA", "MCDBIO", "MCR", "MDN",
    "MDRNGRK", "MEATSCI", "MECHENG", "MEDCOLL", "MEDDIET", "MEDIEVAL", "MEDLBS", "MEDMCIM", "MEDREN", "MEDTECH",
    "MICRBIO", "MICRBIOL", "MILSCI", "MOLBIOC", "MOLBIOCH", "MOLGEN", "MPSCOL", "MUSIC", "MVIMG", "MVNGIMG",
    "NAVALSC", "NELC", "NEURO", "NEUROGS", "NEUROGSP", "NEUROSC", "NEURSGY", "NRSADVN", "NRSPRCT", "NUCLREN",
    "NURSING", "NURSPRCT", "OCCTHER", "OPTHLMOL", "OPTOM", "OPTOMTRY", "ORIENTAT", "OSBP", "OTOLARN", "OTOLARYN",
    "PATHOL", "PDATRICS", "PEDS", "PERSIAN", "PHARMACY", "PHARMCL", "PHARMCOL", "PHILOS", "PHR", "PHYSICS",
    "PHYSIO", "PHYSIOCB", "PHYSMED", "PHYSTHER", "PHYSTHR", "PLNTBIO", "PLNTPTH", "POLISH", "POLITSC", "PORTGESE",
    "PORTGSE", "PSYBHLH", "PSYCH", "PSYCHTRY", "PUBAFRS", "PUBHBIO", "PUBHEHS", "PUBHEPI", "PUBHHBP", "PUBHHMP",
    "PUBHLTH", "PUBPOLM", "QUECHUA", "RADIOLG", "RADIOLGY", "RADSCI", "RELSTDS", "RESPTHER", "RESPTHR", "RNEWNRG",
    "ROMANIA", "ROMANIAN", "ROMLING", "ROOM", "RURLSOC", "RUSSIAN", "SANSKRIT", "SANSKRT", "SASIA", "SBSCOL",
    "SCANDNAV", "SCANDVN", "SCHOLAR", "SLAVIC", "SOCIOL", "SOCWORK", "SOMALI", "SPANISH", "SPHHRNG", "SRBCROA",
    "STAT", "STEP", "SUMMARY", "SURGERY", "SWAHILI", "SWEDISH", "SXLTYST", "TECPHYS", "THEATRE", "TIBETAN",
    "TURKISH", "TXTLCLO", "URDU", "USAS", "UZBEK", "VETBIOS", "VETCLIN", "VETPREV", "VISSCI", "VMCOLL",
    "VOCEDUC", "WELDENG", "WGSST", "WOMSTDS", "YIDDISH", "YORUBA", "ZULU"
]

    
    subject = st.selectbox("Select a subject:", subjects)
    current_year = datetime.now().year
    year = st.number_input("Enter the calendar year:", min_value=2010, max_value=2025, step=1, value=current_year)
    season = st.selectbox("Enter the season:", ['spring', 'summer', 'autumn']).lower()
    
    season_code = {'winter': 0, 'spring': 2, 'summer': 4, 'autumn': 8}
    term = f"{year - 1900}{season_code[season]}"
    
    if st.button("Get Schedule"):
        url = construct_url(subject, term)
        response = requests.get(url)
        
        if response.status_code == 200:
            st.text(response.text)
        else:
            st.write(f"There are no available courses for {subject} in {year} {season}.")

if __name__ == "__main__":
    main()