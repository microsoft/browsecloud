# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

from CountingGridsPy.models import CountingGridModel
from CountingGridsPy.EngineToBrowseCloudPipeline import SlidingWindowTrainer
from scipy import io
import pandas as pd
import numpy as np
import scipy as sp
import os
from sklearn.feature_extraction.text import CountVectorizer


class CGEngineWrapper(object):
    def __init__(self, extent_size=32, window_size=5, layers=2, heartBeaters=None):
        self.cg_size = extent_size
        self.wd_size = window_size
        self.no_layers = layers
        self.heartBeaters = heartBeaters

    def ready_the_matlab_engine(self, X, labels_filtered, DIRECTORY_DATA):
        m, n = X.shape
        s = X.data
        i = X.tocoo().row
        j = X.indices
        io.savemat(DIRECTORY_DATA + '/counts.mat',
                   {'m': m, 'n': n, 's': s, 'i': i, 'j': j})
        if labels_filtered is not None:
            io.savemat(DIRECTORY_DATA + '/labels.mat',
                       {'labels': labels_filtered})

    def __fitCountVectorizor(self, DIRECTORY_DATA, CLEAN_DATA_FILE_NAME, labels, MIN_FREQUENCY):
        df = pd.read_table(DIRECTORY_DATA + CLEAN_DATA_FILE_NAME)
        df = df[df.columns[1:]]
        TEXT = df['pos_filtered'].tolist()
        id_grid = np.array(
            [i for i, t in enumerate(TEXT) if len(str(t).split(" ")) > 3]
        )
        addl_keep = np.zeros(len(TEXT))
        addl_keep[id_grid] += 1
        addl_keep = addl_keep.astype(bool)
        df = df.ix[id_grid].reset_index(drop=True)
        self.labelsS = np.array(
            labels)[id_grid] if labels is not None else None
        vect = CountVectorizer(decode_error="ignore", min_df=MIN_FREQUENCY)
        X = vect.fit_transform(df['pos_filtered'].tolist())
        return (vect, X, addl_keep)

    def get_vocab(self, DIRECTORY_DATA, CLEAN_DATA_FILE_NAME, labels, MIN_FREQUENCY, keep):
        vect, _, addl_keep = self.__fitCountVectorizor(
            DIRECTORY_DATA,
            CLEAN_DATA_FILE_NAME,
            labels,
            MIN_FREQUENCY
        )
        return (vect.get_feature_names(), np.array(keep) & np.array(addl_keep))

    def incremental_fit(
        self, DIRECTORY_DATA, CLEAN_DATA_FILE_NAME, labels,
        MIN_FREQUENCY, keep, engine, initial_max_iter=100,
        w=2000, s=1000, runInitialTrain=True
    ):
        vect, X, addl_keep = self.__fitCountVectorizor(
            DIRECTORY_DATA,
            CLEAN_DATA_FILE_NAME,
            labels,
            MIN_FREQUENCY
        )

        if engine != "numpy":
            raise ValueError("Not implemented!")

        extent = np.array([self.cg_size, self.cg_size])
        window = np.array([self.wd_size, self.wd_size])
        model = CountingGridModel(extent, window)

        T = X.shape[0]
        training_max_iter_vec = [1 for x in range(int(np.ceil((T-w)/s)) + 1)]
        train = model.fit
        kwargs = {
            "data": X.toarray(),
            "max_iter": initial_max_iter,
            "returnSumSquareDifferencesOfPi": False,
            "layers": self.no_layers,
            "noise": .00001,
            "output_directory": DIRECTORY_DATA
        }

        print("Iteration vectors:")
        print("Running for this number of iteration:" +
              str(len([initial_max_iter] + training_max_iter_vec)))
        print([initial_max_iter] + training_max_iter_vec)

        SlidingWindowTrainer.SlidingTrainer(
            w,
            s,
            training_max_iter_vec,
            train,
            kwargs,
            runInitialTrain=runInitialTrain
        )

        return (vect.get_feature_names(), np.array(keep) & np.array(addl_keep))

    def fit(self, DIRECTORY_DATA, CLEAN_DATA_FILE_NAME, labels, MIN_FREQUENCY, keep, engine):
        vect, X, addl_keep = self.__fitCountVectorizor(
            DIRECTORY_DATA,
            CLEAN_DATA_FILE_NAME,
            labels,
            MIN_FREQUENCY
        )

        if engine == "matlab":
            self.ready_the_matlab_engine(X, labels, DIRECTORY_DATA)
            os.system(r"cg_exe_buja.exe {0} counts.mat ".format(
                DIRECTORY_DATA) + str(self.cg_size) + " " + str(self.wd_size) + " " + str(self.no_layers))
        elif engine == "numpy":
            extent = np.array([self.cg_size, self.cg_size])
            window = np.array([self.wd_size, self.wd_size])
            model = CountingGridModel(extent, window)
            model.fit(
                X.toarray(),
                max_iter=100,
                returnSumSquareDifferencesOfPi=False,
                layers=self.no_layers,
                noise=.00000001,
                output_directory=DIRECTORY_DATA,
                heartBeaters=self.heartBeaters
            )
        elif engine == "torch":
            raise ValueError("Not implemented yet.")
        else:
            raise ValueError("The {} engine does not exist.".format(engine))

        return (vect.get_feature_names(), np.array(keep) & np.array(addl_keep))
