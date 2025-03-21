# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| Andrea Miele | 302925 |
| David Revaz | 315773 |
| Zeynep Tandogan | 368526 |

[Milestone 1](#milestone-1) • [Milestone 2](#milestone-2) • [Milestone 3](#milestone-3)

## Milestone 1 (21st March, 5pm)

**10% of the final grade**

This is a preliminary milestone to let you set up goals for your final project and assess the feasibility of your ideas.
Please, fill the following sections about your project.

*(max. 2000 characters per section)*

### Dataset

> Find a dataset (or multiple) that you will explore. Assess the quality of the data it contains and how much preprocessing / data-cleaning it will require before tackling visualization. We recommend using a standard dataset as this course is not about scraping nor data processing.
>
> Hint: some good pointers for finding quality publicly available datasets ([Google dataset search](https://datasetsearch.research.google.com/), [Kaggle](https://www.kaggle.com/datasets), [OpenSwissData](https://opendata.swiss/en/), [SNAP](https://snap.stanford.edu/data/) and [FiveThirtyEight](https://data.fivethirtyeight.com/)), you could use also the DataSets proposed by the ENAC (see the Announcements section on Zulip).

### Problematic

> Frame the general topic of your visualization and the main axis that you want to develop.
> - What am I trying to show with my visualization?
> - Think of an overview for the project, your motivation, and the target audience.

#### Project Overview

The project aims to combine happiness and quality of life data with mental health statistics to create a comprehensive perspective on global well-being. By merging these datasets, we aim to identify and understand the fundamental dynamics influencing well-being globally and investigate the connections among important determinants. Through visualizations, we aim to highlight trends, disparities, and correlations, providing valuable insights into global well-being.

#### Motivation & Target Audience

Our motivation is that global well-being is a critical issue that directly affects the quality of life of individuals and the sustainable development of societies. Today, economic fluctuations, social inequalities, and increasing mental health problems affect well-being levels in different ways around the world. Therefore, understanding the fundamental dynamics that determine well-being is not only beneficial but crucial for:

- **Policymakers:** To create evidence-based policies that improve people's quality of life.
- **Civil Society Organizations & NGOs:** To recognize and resolve disparities in well-being.
- **Researchers & Academics:** To have a better understanding of the factors affecting global well-being for further studies.
- **Individuals & General Public:** To raise awareness and encourage informed discussions on well-being.

#### Our Goals with Visualizations

- Ranking countries on indicators of happiness, quality of life, and mental health.
- Comparing correlations between happiness scores and specific quality of life metrics.
- Assessing the alignment between mental health metrics and overall happiness scores.
- Analyzing improvements or declines in well-being indicators across regions over time.
- Identifying patterns of countries that consistently perform well or poorly on various measures of well-being.
- Detecting countries that deviate significantly from typical relationships observed in the dataset (e.g., high mental health problems despite high happiness scores).
  
### Exploratory Data Analysis

> Pre-processing of the data set you chose
> - Show some basic statistics and get insights about the data

### Related work


> - What others have already done with the data?
> - Why is your approach original?
> - What source of inspiration do you take? Visualizations that you found on other websites or magazines (might be unrelated to your data).
> - In case you are using a dataset that you have already explored in another context (ML or ADA course, semester project...), you are required to share the report of that work to outline the differences with the submission for this class.

Previous studies have examined well-being through various national-level indices, often focusing on one or two dimensions at a time. The Quality of Life Index (QOLI), such as Numbeo’s, aggregates objective factors like safety, healthcare, and cost of living, and correlates strongly with HDI tiers, particularly in countries with “Very High” HDI ([Shu et al., 2022]; [Koohi et al., 2017]). Mental health metrics—e.g., prevalence of disorders or service access—have been analyzed in relation to socioeconomic development, with findings showing that higher HDI is associated with more mental health infrastructure, though inequality can weaken this relationship ([Metcalfe and Drake, 2020]; [Nations, 2017]). Despite its importance, mental health remains underrepresented in composite well-being indices.

The Human Development Index (HDI), which combines education, longevity, and income, is widely used to benchmark national development. HDI aligns closely with many social outcomes and correlates strongly with happiness scores ([Perkins et al., 2021]; [Nations, 2014]). Happiness scores, measured via surveys like the Gallup World Poll, have been popularized through the World Happiness Report, which links happiness to income, health, and social support ([Ortiz-Ospina and Roser, 2017]). Studies using these scores often treat happiness as the outcome variable explained by objective measures; for instance, Jannani et al. found that GDP per capita was the strongest predictor of happiness in a random forest model ([Jannani et al., ]).

Some research has attempted to compare multiple indices, often using correlation or regression analyses between pairs such as HDI and happiness ([Nations, 2014]; [contributors, 2025]). A few have gone further: Perkins et al. examined four well-being metrics simultaneously but did not include mental health or QOLI in their framework ([Perkins et al., 2021]). Thus, most literature focuses on isolated or paired indicators, rarely merging all four: quality of life, mental health, human development, and happiness.

Our approach differs by fully integrating these four dimensions into a single dataset. Rather than explaining one measure with others, it treats all indicators as complementary components of a
2 broader well-being profile. This allows for multidimensional analysis, such as identifying clusters of countries with mismatched well-being indicators. Including mental health as a standalone facet is particularly innovative, addressing a key gap noted by the UNDP ([Nations, 2017]).

### References
[contributors, 2025] contributors, W. (2025). Quality of life.

[Jannani et al., ] Jannani, A., Sael, N., and Benabbou, F. Machine learning for the analysis of quality
of life using the World Happiness Index and Human Development Indicators.

[Koohi et al., 2017] Koohi, F., Nedjat, S., Yaseri, M., and Cheraghi, Z. (2017). Quality of Life
among General Populations of Different Countries in the Past 10 Years, with a Focus on Human
Development Index: A Systematic Review and Meta-analysis.

[Metcalfe and Drake, 2020] Metcalfe, J. and Drake, R. (2020). National levels of human development
and number of mental hospital beds. Epidemiology and Psychiatric Sciences, 29.

[Nations, 2014] Nations, U. (2014). Getting Serious about Happiness.

[Nations, 2017] Nations, U. (2017). Mental health: A fundamental component of human development.

[Ortiz-Ospina and Roser, 2017] Ortiz-Ospina, E. and Roser, M. (2017). Happiness and life satisfaction.

[Perkins et al., 2021] Perkins, D. D., Ozgurer, M. R., Lupton, A., and Omidvar-Tehrani, S. (2021).
Well-Being as Human Development, Equality, Happiness and the Role of Freedom, Activism,
Decentralization, Volunteerism and Voter Participation: A Global Country-Level Study. Frontiers
in Psychology, 12.

[Shu et al., 2022] Shu, Z., Carrasco, R. A., Garcıa-Miguel, J. P., and Sanchez-Montanes, M. (2022).
Multiple scenarios of quality of life index using fuzzy linguistic quantifiers: the case of 85 countries
in Numbeo. Mathematics, 10(12):2091.

## Milestone 2 (18th April, 5pm)

**10% of the final grade**


## Milestone 3 (30th May, 5pm)

**80% of the final grade**


## Late policy

- < 24h: 80% of the grade for the milestone
- < 48h: 70% of the grade for the milestone

