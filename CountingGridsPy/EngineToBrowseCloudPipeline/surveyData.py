# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.


class SurveyData(object):
    def __init__(self, alias, title, abstract, responseId, surveyId, link, image):
        self.alias = alias
        self.title = title
        self.abstract = abstract
        self.responseId = responseId
        self.surveyId = surveyId
        self.link = link
        self.image = image

    def toCols(self):
        return [colname for colname in self.__dict__]
